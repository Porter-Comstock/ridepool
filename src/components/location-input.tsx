"use client"

import { useRef, useEffect, useState, useCallback } from "react"
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
  const isSelectingRef = useRef(false)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  // Sync external value changes
  useEffect(() => {
    if (!isSelectingRef.current) {
      setInputValue(value)
    }
  }, [value])

  // Memoize the onChange callback to prevent re-initializing autocomplete
  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place) return

    // Prefer name + city for establishments, formatted_address for addresses
    let address = ""
    if (place.name && place.formatted_address) {
      // For establishments like "Syracuse Airport", use the name
      // Check if name is different from the street address
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

    // Set flag to prevent sync from overwriting
    isSelectingRef.current = true
    setInputValue(address)
    onChange(address, lat, lng)

    // Reset flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false
    }, 100)
  }, [onChange])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

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

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't update if we're in the middle of selecting from autocomplete
    if (isSelectingRef.current) return

    const newValue = e.target.value
    setInputValue(newValue)
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
