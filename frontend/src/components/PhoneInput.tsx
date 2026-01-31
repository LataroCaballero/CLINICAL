"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search } from "lucide-react";

const COUNTRIES = [
    // Argentina primero (default)
    { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
    // Resto alfabético
    { code: "AF", name: "Afganistán", dialCode: "+93", flag: "🇦🇫" },
    { code: "AL", name: "Albania", dialCode: "+355", flag: "🇦🇱" },
    { code: "DE", name: "Alemania", dialCode: "+49", flag: "🇩🇪" },
    { code: "AD", name: "Andorra", dialCode: "+376", flag: "🇦🇩" },
    { code: "AO", name: "Angola", dialCode: "+244", flag: "🇦🇴" },
    { code: "AG", name: "Antigua y Barbuda", dialCode: "+1268", flag: "🇦🇬" },
    { code: "SA", name: "Arabia Saudita", dialCode: "+966", flag: "🇸🇦" },
    { code: "DZ", name: "Argelia", dialCode: "+213", flag: "🇩🇿" },
    { code: "AM", name: "Armenia", dialCode: "+374", flag: "🇦🇲" },
    { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
    { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
    { code: "AZ", name: "Azerbaiyán", dialCode: "+994", flag: "🇦🇿" },
    { code: "BS", name: "Bahamas", dialCode: "+1242", flag: "🇧🇸" },
    { code: "BD", name: "Bangladés", dialCode: "+880", flag: "🇧🇩" },
    { code: "BB", name: "Barbados", dialCode: "+1246", flag: "🇧🇧" },
    { code: "BH", name: "Baréin", dialCode: "+973", flag: "🇧🇭" },
    { code: "BE", name: "Bélgica", dialCode: "+32", flag: "🇧🇪" },
    { code: "BZ", name: "Belice", dialCode: "+501", flag: "🇧🇿" },
    { code: "BJ", name: "Benín", dialCode: "+229", flag: "🇧🇯" },
    { code: "BY", name: "Bielorrusia", dialCode: "+375", flag: "🇧🇾" },
    { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
    { code: "BA", name: "Bosnia y Herzegovina", dialCode: "+387", flag: "🇧🇦" },
    { code: "BW", name: "Botsuana", dialCode: "+267", flag: "🇧🇼" },
    { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
    { code: "BN", name: "Brunéi", dialCode: "+673", flag: "🇧🇳" },
    { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "🇧🇬" },
    { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
    { code: "BI", name: "Burundi", dialCode: "+257", flag: "🇧🇮" },
    { code: "BT", name: "Bután", dialCode: "+975", flag: "🇧🇹" },
    { code: "CV", name: "Cabo Verde", dialCode: "+238", flag: "🇨🇻" },
    { code: "KH", name: "Camboya", dialCode: "+855", flag: "🇰🇭" },
    { code: "CM", name: "Camerún", dialCode: "+237", flag: "🇨🇲" },
    { code: "CA", name: "Canadá", dialCode: "+1", flag: "🇨🇦" },
    { code: "QA", name: "Catar", dialCode: "+974", flag: "🇶🇦" },
    { code: "TD", name: "Chad", dialCode: "+235", flag: "🇹🇩" },
    { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
    { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
    { code: "CY", name: "Chipre", dialCode: "+357", flag: "🇨🇾" },
    { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
    { code: "KM", name: "Comoras", dialCode: "+269", flag: "🇰🇲" },
    { code: "CG", name: "Congo", dialCode: "+242", flag: "🇨🇬" },
    { code: "CD", name: "Congo (RDC)", dialCode: "+243", flag: "🇨🇩" },
    { code: "KP", name: "Corea del Norte", dialCode: "+850", flag: "🇰🇵" },
    { code: "KR", name: "Corea del Sur", dialCode: "+82", flag: "🇰🇷" },
    { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
    { code: "CI", name: "Costa de Marfil", dialCode: "+225", flag: "🇨🇮" },
    { code: "HR", name: "Croacia", dialCode: "+385", flag: "🇭🇷" },
    { code: "CU", name: "Cuba", dialCode: "+53", flag: "🇨🇺" },
    { code: "DK", name: "Dinamarca", dialCode: "+45", flag: "🇩🇰" },
    { code: "DM", name: "Dominica", dialCode: "+1767", flag: "🇩🇲" },
    { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
    { code: "EG", name: "Egipto", dialCode: "+20", flag: "🇪🇬" },
    { code: "SV", name: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
    { code: "AE", name: "Emiratos Árabes Unidos", dialCode: "+971", flag: "🇦🇪" },
    { code: "ER", name: "Eritrea", dialCode: "+291", flag: "🇪🇷" },
    { code: "SK", name: "Eslovaquia", dialCode: "+421", flag: "🇸🇰" },
    { code: "SI", name: "Eslovenia", dialCode: "+386", flag: "🇸🇮" },
    { code: "ES", name: "España", dialCode: "+34", flag: "🇪🇸" },
    { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
    { code: "EE", name: "Estonia", dialCode: "+372", flag: "🇪🇪" },
    { code: "SZ", name: "Esuatini", dialCode: "+268", flag: "🇸🇿" },
    { code: "ET", name: "Etiopía", dialCode: "+251", flag: "🇪🇹" },
    { code: "PH", name: "Filipinas", dialCode: "+63", flag: "🇵🇭" },
    { code: "FI", name: "Finlandia", dialCode: "+358", flag: "🇫🇮" },
    { code: "FJ", name: "Fiyi", dialCode: "+679", flag: "🇫🇯" },
    { code: "FR", name: "Francia", dialCode: "+33", flag: "🇫🇷" },
    { code: "GA", name: "Gabón", dialCode: "+241", flag: "🇬🇦" },
    { code: "GM", name: "Gambia", dialCode: "+220", flag: "🇬🇲" },
    { code: "GE", name: "Georgia", dialCode: "+995", flag: "🇬🇪" },
    { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
    { code: "GD", name: "Granada", dialCode: "+1473", flag: "🇬🇩" },
    { code: "GR", name: "Grecia", dialCode: "+30", flag: "🇬🇷" },
    { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
    { code: "GN", name: "Guinea", dialCode: "+224", flag: "🇬🇳" },
    { code: "GQ", name: "Guinea Ecuatorial", dialCode: "+240", flag: "🇬🇶" },
    { code: "GW", name: "Guinea-Bisáu", dialCode: "+245", flag: "🇬🇼" },
    { code: "GY", name: "Guyana", dialCode: "+592", flag: "🇬🇾" },
    { code: "HT", name: "Haití", dialCode: "+509", flag: "🇭🇹" },
    { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
    { code: "HU", name: "Hungría", dialCode: "+36", flag: "🇭🇺" },
    { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
    { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
    { code: "IQ", name: "Irak", dialCode: "+964", flag: "🇮🇶" },
    { code: "IR", name: "Irán", dialCode: "+98", flag: "🇮🇷" },
    { code: "IE", name: "Irlanda", dialCode: "+353", flag: "🇮🇪" },
    { code: "IS", name: "Islandia", dialCode: "+354", flag: "🇮🇸" },
    { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
    { code: "IT", name: "Italia", dialCode: "+39", flag: "🇮🇹" },
    { code: "JM", name: "Jamaica", dialCode: "+1876", flag: "🇯🇲" },
    { code: "JP", name: "Japón", dialCode: "+81", flag: "🇯🇵" },
    { code: "JO", name: "Jordania", dialCode: "+962", flag: "🇯🇴" },
    { code: "KZ", name: "Kazajistán", dialCode: "+7", flag: "🇰🇿" },
    { code: "KE", name: "Kenia", dialCode: "+254", flag: "🇰🇪" },
    { code: "KG", name: "Kirguistán", dialCode: "+996", flag: "🇰🇬" },
    { code: "KI", name: "Kiribati", dialCode: "+686", flag: "🇰🇮" },
    { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
    { code: "LA", name: "Laos", dialCode: "+856", flag: "🇱🇦" },
    { code: "LS", name: "Lesoto", dialCode: "+266", flag: "🇱🇸" },
    { code: "LV", name: "Letonia", dialCode: "+371", flag: "🇱🇻" },
    { code: "LB", name: "Líbano", dialCode: "+961", flag: "🇱🇧" },
    { code: "LR", name: "Liberia", dialCode: "+231", flag: "🇱🇷" },
    { code: "LY", name: "Libia", dialCode: "+218", flag: "🇱🇾" },
    { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "🇱🇮" },
    { code: "LT", name: "Lituania", dialCode: "+370", flag: "🇱🇹" },
    { code: "LU", name: "Luxemburgo", dialCode: "+352", flag: "🇱🇺" },
    { code: "MK", name: "Macedonia del Norte", dialCode: "+389", flag: "🇲🇰" },
    { code: "MG", name: "Madagascar", dialCode: "+261", flag: "🇲🇬" },
    { code: "MY", name: "Malasia", dialCode: "+60", flag: "🇲🇾" },
    { code: "MW", name: "Malaui", dialCode: "+265", flag: "🇲🇼" },
    { code: "MV", name: "Maldivas", dialCode: "+960", flag: "🇲🇻" },
    { code: "ML", name: "Malí", dialCode: "+223", flag: "🇲🇱" },
    { code: "MT", name: "Malta", dialCode: "+356", flag: "🇲🇹" },
    { code: "MA", name: "Marruecos", dialCode: "+212", flag: "🇲🇦" },
    { code: "MU", name: "Mauricio", dialCode: "+230", flag: "🇲🇺" },
    { code: "MR", name: "Mauritania", dialCode: "+222", flag: "🇲🇷" },
    { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
    { code: "FM", name: "Micronesia", dialCode: "+691", flag: "🇫🇲" },
    { code: "MD", name: "Moldavia", dialCode: "+373", flag: "🇲🇩" },
    { code: "MC", name: "Mónaco", dialCode: "+377", flag: "🇲🇨" },
    { code: "MN", name: "Mongolia", dialCode: "+976", flag: "🇲🇳" },
    { code: "ME", name: "Montenegro", dialCode: "+382", flag: "🇲🇪" },
    { code: "MZ", name: "Mozambique", dialCode: "+258", flag: "🇲🇿" },
    { code: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
    { code: "NA", name: "Namibia", dialCode: "+264", flag: "🇳🇦" },
    { code: "NR", name: "Nauru", dialCode: "+674", flag: "🇳🇷" },
    { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
    { code: "NI", name: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
    { code: "NE", name: "Níger", dialCode: "+227", flag: "🇳🇪" },
    { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
    { code: "NO", name: "Noruega", dialCode: "+47", flag: "🇳🇴" },
    { code: "NZ", name: "Nueva Zelanda", dialCode: "+64", flag: "🇳🇿" },
    { code: "OM", name: "Omán", dialCode: "+968", flag: "🇴🇲" },
    { code: "NL", name: "Países Bajos", dialCode: "+31", flag: "🇳🇱" },
    { code: "PK", name: "Pakistán", dialCode: "+92", flag: "🇵🇰" },
    { code: "PW", name: "Palaos", dialCode: "+680", flag: "🇵🇼" },
    { code: "PS", name: "Palestina", dialCode: "+970", flag: "🇵🇸" },
    { code: "PA", name: "Panamá", dialCode: "+507", flag: "🇵🇦" },
    { code: "PG", name: "Papúa Nueva Guinea", dialCode: "+675", flag: "🇵🇬" },
    { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
    { code: "PE", name: "Perú", dialCode: "+51", flag: "🇵🇪" },
    { code: "PL", name: "Polonia", dialCode: "+48", flag: "🇵🇱" },
    { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
    { code: "PR", name: "Puerto Rico", dialCode: "+1", flag: "🇵🇷" },
    { code: "GB", name: "Reino Unido", dialCode: "+44", flag: "🇬🇧" },
    { code: "CF", name: "República Centroafricana", dialCode: "+236", flag: "🇨🇫" },
    { code: "CZ", name: "República Checa", dialCode: "+420", flag: "🇨🇿" },
    { code: "DO", name: "República Dominicana", dialCode: "+1", flag: "🇩🇴" },
    { code: "RW", name: "Ruanda", dialCode: "+250", flag: "🇷🇼" },
    { code: "RO", name: "Rumania", dialCode: "+40", flag: "🇷🇴" },
    { code: "RU", name: "Rusia", dialCode: "+7", flag: "🇷🇺" },
    { code: "WS", name: "Samoa", dialCode: "+685", flag: "🇼🇸" },
    { code: "KN", name: "San Cristóbal y Nieves", dialCode: "+1869", flag: "🇰🇳" },
    { code: "SM", name: "San Marino", dialCode: "+378", flag: "🇸🇲" },
    { code: "VC", name: "San Vicente y las Granadinas", dialCode: "+1784", flag: "🇻🇨" },
    { code: "LC", name: "Santa Lucía", dialCode: "+1758", flag: "🇱🇨" },
    { code: "ST", name: "Santo Tomé y Príncipe", dialCode: "+239", flag: "🇸🇹" },
    { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
    { code: "RS", name: "Serbia", dialCode: "+381", flag: "🇷🇸" },
    { code: "SC", name: "Seychelles", dialCode: "+248", flag: "🇸🇨" },
    { code: "SL", name: "Sierra Leona", dialCode: "+232", flag: "🇸🇱" },
    { code: "SG", name: "Singapur", dialCode: "+65", flag: "🇸🇬" },
    { code: "SY", name: "Siria", dialCode: "+963", flag: "🇸🇾" },
    { code: "SO", name: "Somalia", dialCode: "+252", flag: "🇸🇴" },
    { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
    { code: "ZA", name: "Sudáfrica", dialCode: "+27", flag: "🇿🇦" },
    { code: "SD", name: "Sudán", dialCode: "+249", flag: "🇸🇩" },
    { code: "SS", name: "Sudán del Sur", dialCode: "+211", flag: "🇸🇸" },
    { code: "SE", name: "Suecia", dialCode: "+46", flag: "🇸🇪" },
    { code: "CH", name: "Suiza", dialCode: "+41", flag: "🇨🇭" },
    { code: "SR", name: "Surinam", dialCode: "+597", flag: "🇸🇷" },
    { code: "TH", name: "Tailandia", dialCode: "+66", flag: "🇹🇭" },
    { code: "TW", name: "Taiwán", dialCode: "+886", flag: "🇹🇼" },
    { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "🇹🇿" },
    { code: "TJ", name: "Tayikistán", dialCode: "+992", flag: "🇹🇯" },
    { code: "TL", name: "Timor Oriental", dialCode: "+670", flag: "🇹🇱" },
    { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
    { code: "TO", name: "Tonga", dialCode: "+676", flag: "🇹🇴" },
    { code: "TT", name: "Trinidad y Tobago", dialCode: "+1868", flag: "🇹🇹" },
    { code: "TN", name: "Túnez", dialCode: "+216", flag: "🇹🇳" },
    { code: "TM", name: "Turkmenistán", dialCode: "+993", flag: "🇹🇲" },
    { code: "TR", name: "Turquía", dialCode: "+90", flag: "🇹🇷" },
    { code: "TV", name: "Tuvalu", dialCode: "+688", flag: "🇹🇻" },
    { code: "UA", name: "Ucrania", dialCode: "+380", flag: "🇺🇦" },
    { code: "UG", name: "Uganda", dialCode: "+256", flag: "🇺🇬" },
    { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
    { code: "UZ", name: "Uzbekistán", dialCode: "+998", flag: "🇺🇿" },
    { code: "VU", name: "Vanuatu", dialCode: "+678", flag: "🇻🇺" },
    { code: "VA", name: "Vaticano", dialCode: "+39", flag: "🇻🇦" },
    { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
    { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
    { code: "YE", name: "Yemen", dialCode: "+967", flag: "🇾🇪" },
    { code: "DJ", name: "Yibuti", dialCode: "+253", flag: "🇩🇯" },
    { code: "ZM", name: "Zambia", dialCode: "+260", flag: "🇿🇲" },
    { code: "ZW", name: "Zimbabue", dialCode: "+263", flag: "🇿🇼" },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Argentina

interface PhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    countryCode?: string;
    onCountryChange?: (countryCode: string) => void;
}

export function PhoneInput({
    value,
    onChange,
    countryCode: externalCountryCode,
    onCountryChange,
    ...props
}: PhoneInputProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [internalCountryCode, setInternalCountryCode] = useState("AR");

    // Usar código externo si se proporciona, sino usar el interno
    const countryCode = externalCountryCode ?? internalCountryCode;

    const selectedCountry = useMemo(() =>
        COUNTRIES.find(c => c.code === countryCode) || DEFAULT_COUNTRY,
        [countryCode]
    );

    const filteredCountries = useMemo(() => {
        if (!search) return COUNTRIES;
        const q = search.toLowerCase();
        return COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.dialCode.includes(q) ||
            c.code.toLowerCase().includes(q)
        );
    }, [search]);

    const handleSelectCountry = (country: typeof COUNTRIES[0]) => {
        if (onCountryChange) {
            onCountryChange(country.code);
        } else {
            setInternalCountryCode(country.code);
        }
        setOpen(false);
        setSearch("");
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative flex items-center">
                        {/* SELECTOR DE PAÍS */}
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="
                                        absolute left-0 top-0 h-full flex items-center gap-1
                                        px-2 text-sm font-medium text-muted-foreground
                                        bg-muted/30 rounded-l-md border border-r-0 border-input
                                        hover:bg-muted/50 transition-colors cursor-pointer
                                    "
                                >
                                    <span className="text-base">{selectedCountry.flag}</span>
                                    <span className="text-xs">{selectedCountry.dialCode}</span>
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0" align="start">
                                <div className="p-2 border-b">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar país..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-8 h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredCountries.map((country) => (
                                        <button
                                            key={country.code}
                                            type="button"
                                            onClick={() => handleSelectCountry(country)}
                                            className={`
                                                w-full flex items-center gap-2 px-3 py-2 text-sm
                                                hover:bg-accent cursor-pointer text-left
                                                ${country.code === selectedCountry.code ? 'bg-accent/50' : ''}
                                            `}
                                        >
                                            <span className="text-base">{country.flag}</span>
                                            <span className="flex-1 truncate">{country.name}</span>
                                            <span className="text-xs text-muted-foreground">{country.dialCode}</span>
                                        </button>
                                    ))}
                                    {filteredCountries.length === 0 && (
                                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                            No se encontraron países
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* INPUT */}
                        <Input
                            className="pl-24"
                            value={value}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                onChange(raw);
                            }}
                            placeholder="Ej: 2644123456"
                            maxLength={15}
                            {...props}
                        />
                    </div>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                    Ingresa el número sin código de área inicial (0) ni prefijo móvil (15).
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
