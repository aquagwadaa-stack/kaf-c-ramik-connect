from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


admin_path = Path("src/routes/admin.tsx")
admin = admin_path.read_text()

admin = replace_once(
    admin,
    '  const [walkInPeople, setWalkInPeople] = useState(2);\n  const [walkInLabel, setWalkInLabel] = useState("");\n  const [addingTo, setAddingTo] = useState<string | null>(null);',
    '  const [walkInPeople, setWalkInPeople] = useState(2);\n  const [walkInLabel, setWalkInLabel] = useState("");\n  const [walkInPhone, setWalkInPhone] = useState("");\n  const [walkInEmail, setWalkInEmail] = useState("");\n  const [addingTo, setAddingTo] = useState<string | null>(null);',
    "walk-in contact state",
)

admin = replace_once(
    admin,
    '  async function addWalkIn(unitId: string) {\n    setAddingTo(unitId);\n    setWalkInNotice("");\n    setWalkInError("");\n    try {',
    '  async function addWalkIn(unitId: string) {\n    const email = walkInEmail.trim();\n    if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {\n      setWalkInError("Adresse email invalide.");\n      return;\n    }\n    setAddingTo(unitId);\n    setWalkInNotice("");\n    setWalkInError("");\n    try {',
    "walk-in email validation",
)

admin = replace_once(
    admin,
    '        seatingUnitId: unitId,\n        label: walkInLabel,\n      });',
    '        seatingUnitId: unitId,\n        label: walkInLabel,\n        phone: walkInPhone,\n        email,\n      });',
    "walk-in create payload",
)

admin = replace_once(
    admin,
    '      setWalkInLabel("");\n      setWalkInNotice(',
    '      setWalkInLabel("");\n      setWalkInPhone("");\n      setWalkInEmail("");\n      setWalkInNotice(',
    "walk-in form reset",
)

old_name_block = '''            <label>
              <span className="mb-1.5 block text-sm font-medium">Nom ou repère</span>
              <input
                value={walkInLabel}
                onChange={(event) => setWalkInLabel(event.target.value)}
                placeholder="Facultatif · ex. Famille Laurent"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">'''
new_name_block = '''            <label>
              <span className="mb-1.5 block text-sm font-medium">Nom ou repère</span>
              <input
                value={walkInLabel}
                onChange={(event) => setWalkInLabel(event.target.value)}
                placeholder="Facultatif · ex. Famille Laurent"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-medium">
                  Téléphone <span className="font-normal text-muted-foreground">(facultatif)</span>
                </span>
                <input
                  type="tel"
                  value={walkInPhone}
                  onChange={(event) => setWalkInPhone(event.target.value)}
                  placeholder="Ex. 0690 00 00 00"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-medium">
                  Email <span className="font-normal text-muted-foreground">(facultatif)</span>
                </span>
                <input
                  type="email"
                  value={walkInEmail}
                  onChange={(event) => setWalkInEmail(event.target.value)}
                  placeholder="Ex. client@email.com"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">'''
admin = replace_once(admin, old_name_block, new_name_block, "walk-in contact fields")

admin = replace_once(
    admin,
    '''            {reservation.source === "walk_in"
              ? "Groupe ajouté depuis l'accueil"
              : `${reservation.phone} · ${reservation.email}`}''',
    '''            {reservation.source === "walk_in"
              ? `Ajouté par l'équipe${reservation.phone ? ` · ${reservation.phone}` : ""}${reservation.email ? ` · ${reservation.email}` : ""}`
              : `${reservation.phone} · ${reservation.email}`}''',
    "walk-in contact display",
)

admin = replace_once(
    admin,
    '  const [notify, setNotify] = useState(reservation.source !== "walk_in");\n  const [saving, setSaving] = useState(false);',
    '  const [notify, setNotify] = useState(reservation.source !== "walk_in");\n  const [email, setEmail] = useState(reservation.email ?? "");\n  const [showEmailEditor, setShowEmailEditor] = useState(false);\n  const [saving, setSaving] = useState(false);',
    "edit email state",
)

admin = replace_once(
    admin,
    '    if (!date || !slot || !Number.isFinite(count) || count < 1) {\n      setError("Renseigne une date, un créneau et un nombre de personnes valides.");\n      return;\n    }\n    setSaving(true);',
    '    if (!date || !slot || !Number.isFinite(count) || count < 1) {\n      setError("Renseigne une date, un créneau et un nombre de personnes valides.");\n      return;\n    }\n    if (notify && !email.trim()) {\n      setError("Pas de mail ajouté pour cette réservation.");\n      return;\n    }\n    setSaving(true);',
    "notify-without-email guard",
)

admin = replace_once(
    admin,
    '        reactivate: cancelled,\n        notify,\n      });',
    '        reactivate: cancelled,\n        notify,\n        email: email.trim(),\n      });',
    "edit contact payload",
)

old_notify = '''      {reservation.source !== "walk_in" && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
          />
          Prévenir la cliente par email
        </label>
      )}'''
new_notify = '''      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={notify}
          onChange={(event) => setNotify(event.target.checked)}
        />
        Prévenir la cliente par email
      </label>

      {showEmailEditor && (
        <label className="grid max-w-md gap-1">
          <span className="text-xs text-muted-foreground">Email client</span>
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="client@email.com"
            autoFocus
            required={notify}
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
      )}'''
admin = replace_once(admin, old_notify, new_notify, "notification checkbox for all reservations")

admin = replace_once(
    admin,
    '      {error && <p className="text-xs text-destructive">{error}</p>}',
    '''      {error && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>{error}</span>
          {error === "Pas de mail ajouté pour cette réservation." && !showEmailEditor && (
            <button
              type="button"
              onClick={() => {
                setShowEmailEditor(true);
                setError("");
              }}
              className="font-medium underline underline-offset-2"
            >
              Ajouter un mail
            </button>
          )}
        </div>
      )}''',
    "missing-email action",
)

admin_path.write_text(admin)

reservations_path = Path("src/lib/reservations.ts")
reservations = reservations_path.read_text()

reservations = replace_once(
    reservations,
    '''export async function addWalkInReservation(input: {
  date: string;
  slot: string;
  people: number;
  seatingUnitId: string;
  label?: string;
}): Promise<Reservation> {
  const label = input.label?.trim() || "Groupe sur place";
  let full: Reservation = {''',
    '''export async function addWalkInReservation(input: {
  date: string;
  slot: string;
  people: number;
  seatingUnitId: string;
  label?: string;
  phone?: string;
  email?: string;
}): Promise<Reservation> {
  const label = input.label?.trim() || "Groupe sur place";
  const phone = input.phone?.trim() ?? "";
  const email = (input.email ?? "").trim().toLowerCase();
  let full: Reservation = {''',
    "walk-in input contact fields",
)

reservations = replace_once(
    reservations,
    '    phone: "",\n    email: "",',
    '    phone,\n    email,',
    "walk-in contact storage",
)

reservations = replace_once(
    reservations,
    '        p_seating_unit_id: input.seatingUnitId,\n        p_label: label,\n      },',
    '        p_seating_unit_id: input.seatingUnitId,\n        p_label: label,\n        p_phone: phone,\n        p_email: email,\n      },',
    "walk-in RPC contact args",
)

reservations = replace_once(
    reservations,
    '  input: { date: string; slot: string; people: number; reactivate?: boolean; notify?: boolean },',
    '  input: { date: string; slot: string; people: number; reactivate?: boolean; notify?: boolean; email?: string },',
    "reservation edit input",
)

reservations = replace_once(
    reservations,
    '''              ...item,
              ...patch,
              status: input.reactivate && item.status === "cancelled" ? "confirmed" : item.status,''',
    '''              ...item,
              ...patch,
              ...(input.email !== undefined ? { email: input.email.trim() } : {}),
              status: input.reactivate && item.status === "cancelled" ? "confirmed" : item.status,''',
    "local edit email persistence",
)

reservations = replace_once(
    reservations,
    '''  write(
    read().map((item) =>
      item.id === id ? { ...item, ...patch, ...result.value, status: result.status } : item,
    ),
  );
  refreshReservationOccupancies();''',
    '''  const nextValue: Reservation = {
    ...result.value,
    ...(input.email !== undefined ? { email: input.email.trim() } : {}),
  };
  if (input.email !== undefined && input.email.trim() !== (result.value.email ?? "").trim()) {
    await patchRow("kafe_reservations", id, { value: nextValue }, true);
  }

  write(
    read().map((item) =>
      item.id === id ? { ...item, ...patch, ...nextValue, status: result.status } : item,
    ),
  );
  refreshReservationOccupancies();''',
    "remote edit email persistence",
)

reservations_path.write_text(reservations)
print("Patch applied successfully")
