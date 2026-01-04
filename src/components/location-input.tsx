"use client"

import { useRef, useEffect } from "react"
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
  // Use a ref to always have the latest onChange function (avoids stale closure)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  // Initialize Google Places Autocomplete
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

      if (!place) {
        console.log("No place selected")
        return
      }

      console.log("Place selected:", place)

      // Get the best representation of the place
      let address = ""

      if (place.formatted_address) {
        // If we have a formatted address, use it
        // But prefer the place name for establishments
        if (place.name && place.name !== place.formatted_address.split(",")[0]?.trim()) {
          // It's an establishment with a different name (like "Syracuse Airport")
          address = place.name
        } else {
          // Use the full formatted address
          address = place.formatted_address
        }
      } else if (place.name) {
        // Fallback to name if no formatted address
        address = place.name
      }

      console.log("Final address:", address)

      if (!address) {
        console.log("No address found in place result")
        return
      }

      const lat = place.geometry?.location?.lat()
      const lng = place.geometry?.location?.lng()

      // Update the input value directly
      if (inputRef.current) {
        inputRef.current.value = address
      }

      // Use the ref to get the latest onChange function
      onChangeRef.current(address, lat, lng)
    })

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [isLoaded])

  // Sync the input value when external value changes (e.g., form reset)
  useEffect(() => {
    if (inputRef.current && value === "" && inputRef.current.value !== "") {
      inputRef.current.value = ""
    }
  }, [value])

  // Handle manual typing - only update on blur to avoid interfering with autocomplete
  const handleBlur = () => {
    if (inputRef.current) {
      onChangeRef.current(inputRef.current.value)
    }
  }

  const inputClassName = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`

  if (loadError) {
    return (
      <input
        type="text"
        defaultValue={value}
        onBlur={handleBlur}
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
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      className={inputClassName}
    />
  )
}
