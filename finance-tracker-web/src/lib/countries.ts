export type Country = {
    name: string;
    code: string; // ISO 3166-1 alpha-2
    dial_code: string;
};

// Prefer built-in list; fall back to curated defaults if package absent.
let list: Country[] = []
try {
    const wc = (await import('world-countries')).default as Array<{ cca2: string; name: { common: string }, idd?: { root?: string, suffixes?: string[] } }>
    list = wc
        .map(c => {
            const root = c.idd?.root || ''
            const suff = (c.idd?.suffixes && c.idd.suffixes[0]) || ''
            const dial = (root + suff) || ''
            return { name: c.name.common, code: c.cca2.toLowerCase(), dial_code: dial.startsWith('+') ? dial : (dial ? `+${dial}` : '') }
        })
        .filter(c => !!c.dial_code)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
} catch {}

export const countries: Country[] = list.length ? list : [
    { name: "Perú", code: "pe", dial_code: "+51" },
    { name: "Argentina", code: "ar", dial_code: "+54" },
    { name: "México", code: "mx", dial_code: "+52" },
    { name: "Estados Unidos", code: "us", dial_code: "+1" },
]

