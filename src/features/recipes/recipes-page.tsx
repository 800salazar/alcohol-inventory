import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddRecipeDetail,
  useCreateRecipe,
  useDeleteRecipe,
  useDeleteRecipeDetail,
  useRecipes,
} from './queries'
import { useProducts } from '@/features/products/queries'
import { useBottleTypes } from '@/features/bottle-types/queries'
import { useAuth } from '@/features/auth/auth-provider'
import type { RecipeWithDetails } from '@/types'
import { formatOunces } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/data-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export function RecipesPage() {
  const { data, isLoading, error } = useRecipes()
  const { data: products } = useProducts()
  const createRecipe = useCreateRecipe()

  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState('')

  const onCreateRecipe = async () => {
    if (!productId) {
      toast.error('Selecciona un producto')
      return
    }
    try {
      await createRecipe.mutateAsync(productId)
      toast.success('Receta creada')
      setOpen(false)
      setProductId('')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo crear (¿el producto ya tiene receta activa?)',
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="Recetas"
        description="Define los ingredientes (tipo de botella + onzas) de cada producto."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva receta
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : !data?.length ? (
        <EmptyState label="Aún no hay recetas." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva receta</DialogTitle>
            <DialogDescription>
              Cada producto puede tener una sola receta activa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreateRecipe} disabled={createRecipe.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const { isAdmin } = useAuth()
  const { data: bottleTypes } = useBottleTypes()
  const addDetail = useAddRecipeDetail()
  const deleteDetail = useDeleteRecipeDetail()
  const deleteRecipe = useDeleteRecipe()

  const [bottleTypeId, setBottleTypeId] = useState('')
  const [ounces, setOunces] = useState('')

  const onAdd = async () => {
    if (!bottleTypeId || !ounces || Number(ounces) <= 0) {
      toast.error('Selecciona un tipo de botella y onzas > 0')
      return
    }
    try {
      await addDetail.mutateAsync({
        recipe_id: recipe.id,
        bottle_type_id: bottleTypeId,
        ounces: Number(ounces),
      })
      setBottleTypeId('')
      setOunces('')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo agregar el ingrediente',
      )
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {recipe.product?.name ?? 'Producto'}
          <Badge variant={recipe.active ? 'success' : 'secondary'}>
            {recipe.active ? 'Activa' : 'Inactiva'}
          </Badge>
        </CardTitle>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('¿Eliminar la receta completa?')) {
                deleteRecipe.mutate(recipe.id)
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {recipe.recipe_details.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ingredientes aún.</p>
        ) : (
          <ul className="space-y-1.5">
            {recipe.recipe_details.map((detail) => (
              <li
                key={detail.id}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
              >
                <span>{detail.bottle_type?.name ?? 'Tipo'}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatOunces(detail.ounces)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteDetail.mutate(detail.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2 border-t pt-3">
          <div className="flex-1">
            <Select value={bottleTypeId} onValueChange={setBottleTypeId}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Tipo de botella" />
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
          <Input
            className="h-8 w-20"
            inputMode="decimal"
            placeholder="oz"
            value={ounces}
            onChange={(e) => setOunces(e.target.value)}
          />
          <Button size="sm" onClick={onAdd} disabled={addDetail.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
