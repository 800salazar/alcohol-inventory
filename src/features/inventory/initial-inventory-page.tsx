import { useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, Warehouse, Wine } from 'lucide-react'
import { toast } from 'sonner'
import { useCaptureInitialInventory } from './queries'
import type { InitialInventoryLine } from './api'
import { useBottles } from '@/features/bottles/queries'
import type { BottleWithType } from '@/types'
import { formatOunces } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { LoadingState } from '@/components/data-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Location = 'WAREHOUSE' | 'BAR'

interface StagedLine {
  bottle: BottleWithType
  location: Location
  ounces: number
}

export function InitialInventoryPage() {
  const { data: bottles, isLoading } = useBottles()
  const captureMut = useCaptureInitialInventory()

  const [lines, setLines] = useState<StagedLine[]>([])
  const [bottleId, setBottleId] = useState('')
  const [location, setLocation] = useState<Location>('WAREHOUSE')
  const [ouncesInput, setOuncesInput] = useState('')
  const [notes, setNotes] = useState('')

  const stagedIds = useMemo(
    () => new Set(lines.map((l) => l.bottle.id)),
    [lines],
  )
  const available = useMemo(
    () => bottles?.filter((b) => !stagedIds.has(b.id)) ?? [],
    [bottles, stagedIds],
  )

  const selectedBottle = bottles?.find((b) => b.id === bottleId)
  const fullOunces = selectedBottle?.bottle_type?.full_ounces ?? 0

  const addLine = () => {
    if (!selectedBottle) {
      toast.error('Selecciona una botella')
      return
    }
    let ounces: number
    if (location === 'WAREHOUSE') {
      ounces = fullOunces // en bodega la botella está sellada (llena)
    } else {
      ounces = Number(ouncesInput)
      if (!ouncesInput || Number.isNaN(ounces) || ounces < 0) {
        toast.error('Captura las onzas actuales (≥ 0)')
        return
      }
    }
    setLines((prev) => [...prev, { bottle: selectedBottle, location, ounces }])
    setBottleId('')
    setOuncesInput('')
  }

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.bottle.id !== id))

  const save = async () => {
    if (lines.length === 0) {
      toast.error('Agrega al menos una botella')
      return
    }
    const payload: InitialInventoryLine[] = lines.map((l) => ({
      bottle_id: l.bottle.id,
      location: l.location,
      current_ounces: l.ounces,
    }))
    try {
      await captureMut.mutateAsync({ notes, lines: payload })
      toast.success(`Inventario inicial capturado (${lines.length} botellas)`)
      setLines([])
      setNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Inventario inicial"
        description="Carga única al arrancar: ubica cada botella en bodega o barra."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Líneas capturadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Botellas capturadas ({lines.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lines.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                Aún no agregas botellas. Usa el panel de la derecha.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Onzas</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.bottle.id}>
                      <TableCell className="font-mono text-sm">
                        {line.bottle.unique_code}
                      </TableCell>
                      <TableCell>{line.bottle.bottle_type?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            line.location === 'WAREHOUSE' ? 'secondary' : 'default'
                          }
                        >
                          {line.location === 'WAREHOUSE' ? 'Bodega' : 'Barra'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatOunces(line.ounces)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeLine(line.bottle.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Panel de captura */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agregar botella</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Botella (código — tipo)</Label>
                <Select value={bottleId} onValueChange={setBottleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una botella" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.unique_code} — {b.bottle_type?.name ?? '—'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={location === 'WAREHOUSE' ? 'default' : 'outline'}
                    onClick={() => setLocation('WAREHOUSE')}
                  >
                    <Warehouse className="h-4 w-4" />
                    Bodega
                  </Button>
                  <Button
                    type="button"
                    variant={location === 'BAR' ? 'default' : 'outline'}
                    onClick={() => setLocation('BAR')}
                  >
                    <Wine className="h-4 w-4" />
                    Barra
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ounces">Onzas actuales</Label>
                <Input
                  id="ounces"
                  inputMode="decimal"
                  placeholder={location === 'WAREHOUSE' ? `Llena (${fullOunces})` : '8'}
                  value={location === 'WAREHOUSE' ? '' : ouncesInput}
                  disabled={location === 'WAREHOUSE'}
                  onChange={(e) => setOuncesInput(e.target.value)}
                />
                {location === 'WAREHOUSE' && (
                  <p className="text-xs text-muted-foreground">
                    En bodega la botella se registra llena automáticamente.
                  </p>
                )}
              </div>

              <Button className="w-full" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Conteo de apertura"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={save}
                disabled={captureMut.isPending || lines.length === 0}
              >
                {captureMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Guardar inventario inicial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
