import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { LoginPage } from '@/features/auth/login-page'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { BottleTypesPage } from '@/features/bottle-types/bottle-types-page'
import { BottlesPage } from '@/features/bottles/bottles-page'
import { CategoriesPage } from '@/features/categories/categories-page'
import { BottleCategoriesPage } from '@/features/bottle-categories/bottle-categories-page'
import { ProductsPage } from '@/features/products/products-page'
import { RecipesPage } from '@/features/recipes/recipes-page'
import { InitialInventoryPage } from '@/features/inventory/initial-inventory-page'
import { UsersPage } from '@/features/profiles/users-page'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas que requieren sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="bottle-types" element={<BottleTypesPage />} />
          <Route path="bottles" element={<BottlesPage />} />
          <Route path="bottle-categories" element={<BottleCategoriesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="initial-inventory" element={<InitialInventoryPage />} />

          {/* Solo ADMIN */}
          <Route element={<ProtectedRoute requireRole="ADMIN" />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
