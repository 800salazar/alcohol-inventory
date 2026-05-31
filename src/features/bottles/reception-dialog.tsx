import { useState } from 'react'
import { Loader2, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useReceiveBottles, useReceiveBottlesManual } from './queries'
import { useBottleTypes } from '@/features/bottle-types/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Mode = 'auto' | 'manual'

export function ReceptionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: bottleTypes } = useBottleTypes()
  const receiveAuto = useReceiveBottles()
  const receiveManual = useReceiveBottlesManual()

  const [mode, setMode] = useState<Mode>('auto')
  const [bottleTypeId, setBottleTypeId] = useState('')
  const [count, setCount] = useState('12')
  const [codesText, setCodesText] = useState('')

  const reset = () => {
    setBottleTypeId('')
    setCount('12')
    setCodesText('')
    setMode('auto')
  }

  const submit = async () => {
    if (!bottleTypeId) {
      toast.error('Selecciona un tipo de botella')
      return
    }
    try {
      if (mode === 'auto') {
        const n = Number(count)
        if (!Number.isInteger(n) || n < 1) {
          toast.error('Cantidad inválida')
          return
        }
        const created = await receiveAuto.mutateAsync({ bottleTypeId, count: n })
        toast.success(
          `${created.length} botellas recibidas (códigos ${created[0]?.unique_code}–${created[created.length - 1]?.unique_code})`,
        )
      } else {
        const codes = codesText
          .split(/[\s,]+/)
          .map((c) => c.trim())
          .filter(Boolean)
        if (codes.length === 0) {
          toast.error('Captura al menos un código')
          return
        }
        const type = bottleTypes?.find((t) => t.id === bottleTypeId)
        await receiveManual.mutateAsync({
          bottleTypeId,
          codes,
          fullOunces: type?.full_ounces ?? 0,
        })
        toast.success(`${codes.length} botellas recibidas`)
      }
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo recibir (¿código duplicado?)',
      )
    }
  }

  const pending = receiveAuto.isPending || receiveManual.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Recepción de botellas
          </DialogTitle>
          <DialogDescription>
            Las botellas entran llenas y en bodega (IN_WAREHOUSE).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de botella</Label>
            <Select value={bottleTypeId} onValueChange={setBottleTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {bottleTypes?.map((bt) => (
                  <SelectItem key={bt.id} value={bt.id}>
                    {bt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de modo */}
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={mode === 'auto'}
              onClick={() => setMode('auto')}
              title="Automático"
              subtitle="Genera códigos"
            />
            <ModeButton
              active={mode === 'manual'}
              onClick={() => setMode('manual')}
              title="Manual"
              subtitle="Capturas códigos"
            />
          </div>

          {mode === 'auto' ? (
            <div className="space-y-2">
              <Label htmlFor="count">Cantidad</Label>
              <Input
                id="count"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                El sistema asigna los códigos correlativos automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="codes">Códigos</Label>
              <textarea
                id="codes"
                rows={4}
                value={codesText}
                onChange={(e) => setCodesText(e.target.value)}
                placeholder={'10001\n10002\n10003'}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Uno por línea (o separados por espacios/comas).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Recibir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border p-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5'
          : 'border-input hover:bg-accent',
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  )
}
