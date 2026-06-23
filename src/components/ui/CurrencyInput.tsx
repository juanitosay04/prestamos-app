"use client"

import React, { useState, useEffect } from "react"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number
  onChange: (value: string) => void
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  useEffect(() => {
    if (value === "" || value === undefined || value === null) {
      setDisplayValue("")
      return
    }
    
    // Parse value removing non-digits to handle strings that might accidentally have dots
    const cleanStr = String(value).replace(/[^\d-]/g, "")
    const num = parseInt(cleanStr, 10)
    
    if (!isNaN(num)) {
      setDisplayValue(num.toLocaleString("es-CO", { maximumFractionDigits: 0 }))
    } else {
      setDisplayValue("")
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only digits and minus sign
    let rawValue = e.target.value.replace(/[^\d-]/g, "")
    
    if (rawValue === "-" || rawValue === "") {
      setDisplayValue(rawValue)
      onChange(rawValue)
      return
    }

    // Prevent multiple minus signs
    if (rawValue.lastIndexOf("-") > 0) {
      rawValue = rawValue.replace(/-/g, "")
      rawValue = "-" + rawValue
    }

    onChange(rawValue)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      {...props}
    />
  )
}
