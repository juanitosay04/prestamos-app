import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"
import { notifyDailySummary } from "@/lib/telegram"

// Vercel Cron Job to send daily email and telegram notifications of pending and overdue installments
export async function GET(request: Request) {
  try {
    // 1. Fetch pending and overdue installments
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)

    // Cuotas que vencen hoy
    const dueTodayInstallments = await prisma.installment.findMany({
      where: {
        status: "PENDING",
        loan: { status: { not: "REFINANCED" } },
        dueDate: {
          gte: today,
          lte: endOfToday
        }
      },
      include: {
        loan: { include: { client: true } }
      }
    })

    // Cuotas vencidas (antes de hoy)
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        status: "PENDING",
        loan: { status: { not: "REFINANCED" } },
        dueDate: {
          lt: today
        }
      },
      include: {
        loan: { include: { client: true } }
      }
    })

    // Notificación automática a Telegram para colaboradores
    try {
      const formattedDueToday = dueTodayInstallments.map(inst => ({
        clientName: `${inst.loan.client.firstName} ${inst.loan.client.lastName}`,
        amount: inst.expectedAmount - inst.amountPaid,
        installmentNumber: inst.installmentNumber
      }))

      const formattedOverdue = overdueInstallments.map(inst => {
        const diffTime = Math.abs(today.getTime() - new Date(inst.dueDate).getTime())
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
          clientName: `${inst.loan.client.firstName} ${inst.loan.client.lastName}`,
          amount: inst.expectedAmount - inst.amountPaid,
          dueDate: new Date(inst.dueDate),
          daysOverdue
        }
      })

      if (formattedDueToday.length > 0 || formattedOverdue.length > 0) {
        await notifyDailySummary({
          dueToday: formattedDueToday,
          overdue: formattedOverdue
        })
      }
    } catch (telErr) {
      console.error("Cron Telegram Error:", telErr)
    }

    if (dueTodayInstallments.length === 0 && overdueInstallments.length === 0) {
      return NextResponse.json({ success: true, message: "No pending or overdue installments for today." })
    }

    // 2. Fetch all admins and secretaries to notify
    const usersToNotify = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SECRETARY"] } }
    })

    const toEmails = usersToNotify.map(u => u.email).filter(Boolean)

    if (toEmails.length === 0) {
      return NextResponse.json({ success: false, error: "No users configured to receive emails." })
    }

    // 3. Build HTML content
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Resumen Diario de Cobros - JyJ Préstamos</h2>
        <p>Fecha: ${today.toLocaleDateString('es-CO')}</p>
    `

    if (dueTodayInstallments.length > 0) {
      htmlContent += `
        <h3 style="color: #10b981; border-bottom: 1px solid #eee; padding-bottom: 5px;">Cobros para HOY:</h3>
        <ul>
      `
      dueTodayInstallments.forEach(inst => {
        const clientName = `${inst.loan.client.firstName} ${inst.loan.client.lastName}`
        const amount = (inst.expectedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })
        htmlContent += `<li><strong>${clientName}</strong>: $${amount} (Cuota ${inst.installmentNumber})</li>`
      })
      htmlContent += `</ul>`
    }

    if (overdueInstallments.length > 0) {
      htmlContent += `
        <h3 style="color: #ef4444; border-bottom: 1px solid #eee; padding-bottom: 5px;">Cobros en MORA:</h3>
        <ul>
      `
      overdueInstallments.forEach(inst => {
        const clientName = `${inst.loan.client.firstName} ${inst.loan.client.lastName}`
        const amount = (inst.expectedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })
        htmlContent += `<li><strong>${clientName}</strong>: $${amount} (Venció el ${new Date(inst.dueDate).toLocaleDateString('es-CO')})</li>`
      })
      htmlContent += `</ul>`
    }

    htmlContent += `
        <br/>
        <p style="font-size: 12px; color: #888;">Este es un mensaje automático del sistema JyJ Préstamos.</p>
      </div>
    `

    // 4. Send Email using NodeMailer
    const smtpUrl = process.env.SMTP_URL
    if (!smtpUrl) {
      console.warn("SMTP_URL no está configurado. Registrando el email en consola en su lugar:")
      console.log(`To: ${toEmails.join(', ')}\n\nHTML:\n${htmlContent}`)
      return NextResponse.json({ success: true, message: "Email logged to console (SMTP_URL missing)." })
    }

    const transporter = nodemailer.createTransport(smtpUrl)

    await transporter.sendMail({
      from: '"JyJ Préstamos" <noreply@jyjprestamos.com>',
      to: toEmails.join(", "),
      subject: `Resumen de Cobros - ${today.toLocaleDateString('es-CO')}`,
      html: htmlContent
    })

    return NextResponse.json({ success: true, message: "Email sent successfully." })
  } catch (error: any) {
    console.error("Cron Error (daily-email):", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
