export type Country = {
    name: string;
    code: string; // ISO 3166-1 alpha-2
    dial_code: string;
};

export const countries: Country[] = [
    { name: "Perú", code: "pe", dial_code: "+51" },
    { name: "Argentina", code: "ar", dial_code: "+54" },
    { name: "Bolivia", code: "bo", dial_code: "+591" },
    { name: "Brasil", code: "br", dial_code: "+55" },
    { name: "Chile", code: "cl", dial_code: "+56" },
    { name: "Colombia", code: "co", dial_code: "+57" },
    { name: "Ecuador", code: "ec", dial_code: "+593" },
    { name: "México", code: "mx", dial_code: "+52" },
    { name: "Paraguay", code: "py", dial_code: "+595" },
    { name: "Uruguay", code: "uy", dial_code: "+598" },
    { name: "Venezuela", code: "ve", dial_code: "+58" },
    { name: "Estados Unidos", code: "us", dial_code: "+1" },
];

