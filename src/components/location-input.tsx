"use client"

import { useRef, useEffect, useState } from "react"
import { useLoadScript } from "@react-google-maps/api"

const libraries: ("places")[] = ["places"]

interface LocationInputProps {
  value: string
  onChange: (value: string, lat?: number, lng?: number) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Enter location",
  required = false,
  className = "",
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(value)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode", "establishment"],
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry", "name"],
    })

    // Listen for place selection
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place) return

      const address = place.formatted_address || place.name || ""
      const lat = place.geometry?.location?.lat()
      const lng = place.geometry?.location?.lng()

      setInputValue(address)
      onChange(address, lat, lng)
    })

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, onChange])

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    // Only call onChange without coordinates for manual typing
    // Coordinates will be set when user selects from dropdown
    onChange(newValue)
  }

  if (loadError) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      />
    )
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        disabled
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 ${className}`}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      required={required}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  )
}
