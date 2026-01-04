"use client"

import { useRef, useEffect, useCallback } from "react"
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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  // Handle place selection from autocomplete
  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place) return

    // Get the place name for establishments, or formatted address for regular addresses
    let address = ""
    if (place.name && place.formatted_address) {
      // For establishments like "Syracuse Airport", use the name
      const formattedParts = place.formatted_address.split(",")
      if (place.name !== formattedParts[0]?.trim()) {
        address = place.name
      } else {
        address = place.formatted_address
      }
    } else {
      address = place.formatted_address || place.name || ""
    }

    const lat = place.geometry?.location?.lat()
    const lng = place.geometry?.location?.lng()

    // Update the input value directly via DOM
    if (inputRef.current) {
      inputRef.current.value = address
    }

    // Notify parent
    onChange(address, lat, lng)
  }, [onChange])

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    // Only initialize once
    if (autocompleteRef.current) return

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode", "establishment"],
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry", "name"],
    })

    // Listen for place selection
    autocompleteRef.current.addListener("place_changed", handlePlaceChanged)

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, handlePlaceChanged])

  // Sync the input value when external value changes (e.g., form reset)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value
    }
  }, [value])

  // Handle manual typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const inputClassName = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`

  if (loadError) {
    return (
      <input
        type="text"
        defaultValue={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className={inputClassName}
      />
    )
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        defaultValue={value}
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
      defaultValue={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      required={required}
      className={inputClassName}
    />
  )
}
