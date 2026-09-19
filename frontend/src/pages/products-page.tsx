import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'

export function ProductsPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const [name, setName] = useState('')
  const [priceEgp, setPriceEgp] = useState('')
  const [sizes, setSizes] = useState('M, L, XL')
  const [colors, setColors] = useState('أسود, أبيض')

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setName('')
      setPriceEgp('')
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const toggleStock = useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) =>
      updateProduct(id, { inStock }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  return (
    <PageLayout title={t('navProducts')} description={t('productsIntro')}>
      <form
        className="grid w-full gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !priceEgp) return
          createMut.mutate({
            name: name.trim(),
            priceEgp: Number(priceEgp),
            sizes: sizes
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            colors: colors
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }}
      >
        <InputField
          id="productName"
          label={t('productName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('productNamePlaceholder')}
        />
        <InputField
          id="productPrice"
          type="number"
          label={t('productPrice')}
          value={priceEgp}
          onChange={(e) => setPriceEgp(e.target.value)}
          placeholder="750"
        />
        <InputField
          id="sizes"
          label={t('productSizes')}
          value={sizes}
          onChange={(e) => setSizes(e.target.value)}
        />
        <InputField
          id="colors"
          label={t('productColors')}
          value={colors}
          onChange={(e) => setColors(e.target.value)}
        />
        <div className="sm:col-span-2 xl:col-span-4">
          <Button type="submit" disabled={createMut.isPending}>
            {t('addProduct')}
          </Button>
        </div>
      </form>

      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(productsQuery.data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div>
              <p className="font-semibold text-ink">{p.name}</p>
              <p className="text-sm text-muted">
                {p.priceEgp.toLocaleString()} ج.م
                {p.sizes.length ? ` · ${p.sizes.join(', ')}` : ''}
                {p.colors.length ? ` · ${p.colors.join(', ')}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toggleStock.mutate({ id: p.id, inStock: !p.inStock })
                }
              >
                {p.inStock ? t('inStock') : t('outOfStock')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMut.mutate(p.id)}
              >
                {t('delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {productsQuery.data?.length === 0 ? (
        <p className="text-sm text-muted">{t('noProducts')}</p>
      ) : null}
    </PageLayout>
  )
}
