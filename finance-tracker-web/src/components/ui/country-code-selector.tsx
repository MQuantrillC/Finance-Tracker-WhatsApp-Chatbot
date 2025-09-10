"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { countries, Country } from "@/lib/countries"

interface CountryCodeSelectorProps {
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
}

export function CountryCodeSelector({ selectedCountry, setSelectedCountry }: CountryCodeSelectorProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between"
        >
          <div className="flex items-center">
            <Image
              src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
              width={20}
              height={15}
              alt={selectedCountry.name}
              className="mr-2"
            />
            {selectedCountry.name} ({selectedCountry.dial_code})
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar país..." />
          <CommandEmpty>No se encontró el país.</CommandEmpty>
          <CommandGroup>
            {countries.map((country) => (
              <CommandItem
                key={country.code}
                value={country.name}
                onSelect={() => {
                  setSelectedCountry(country)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <Image
                  src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                  width={20}
                  height={15}
                  alt={country.name}
                  className="mr-2"
                />
                {country.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

