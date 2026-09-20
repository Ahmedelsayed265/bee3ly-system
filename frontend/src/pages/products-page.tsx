import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, PackagePlus, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputField } from '@/components/ui/input-field'
import { useAuth } from '@/features/auth/auth-context'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  type BusinessType,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import {
  ATTRIBUTE_TEMPLATES,
  buildAttributesFromForm,
  resolveAttributeEntries,
  usesQuantityStock,
} from '@/features/products/attribute-templates'
import { cn } from '@/lib/utils'

export function ProductsPage() {
  const { t } = useLocale()
  const { business } = useAuth()
  const qc = useQueryClient()
  const businessType = (business?.type ?? 'OTHER') as BusinessType
  const template = ATTRIBUTE_TEMPLATES[businessType] ?? ATTRIBUTE_TEMPLATES.OTHER
  const quantityMode = usesQuantityStock(businessType)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [priceEgp, setPriceEgp] = useState('')
  const [description, setDescription] = useState('')
  const [stockQuantity, setStockQuantity] = useState('10')
  const [listingAvailable, setListingAvailable] = useState(true)
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    {},
  )
  const [customRows, setCustomRows] = useState<
    Array<{ key: string; value: string }>
  >([])

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const resetForm = () => {
    setName('')
    setPriceEgp('')
    setDescription('')
    setStockQuantity('10')
    setListingAvailable(true)
    setTemplateValues({})
    setCustomRows([])
  }

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      resetForm()
      setOpen(false)
      toast.success(t('profileSaved'))
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error(t('saveFailed')),
  })

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const updateStockMut = useMutation({
    mutationFn: (
      input:
        | { id: string; stockQuantity: number }
        | { id: string; inStock: boolean },
    ) => {
      const { id, ...patch } = input
      return updateProduct(id, patch)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const formHint = useMemo(() => t('productDetailsHint'), [t])
  const products = productsQuery.data ?? []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !priceEgp) return
    const attributes = buildAttributesFromForm({
      template,
      templateValues,
      customRows,
    })
    createMut.mutate({
      name: name.trim(),
      priceEgp: Number(priceEgp),
      description: description.trim() || undefined,
      attributes,
      ...(quantityMode
        ? { stockQuantity: Math.max(0, Number(stockQuantity) || 0) }
        : { inStock: listingAvailable }),
    })
  }

  return (
    <PageLayout
      title={t('navProducts')}
      description={t('productsIntro')}
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('addProduct')}
        </Button>
      }
    >
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addProductTitle')}</DialogTitle>
            <DialogDescription>{t('addProductHint')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InputField
                  id="productName"
                  label={t('productName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('productNamePlaceholder')}
                  containerClassName="sm:col-span-2"
                />
                <InputField
                  id="productPrice"
                  type="number"
                  label={t('productPrice')}
                  value={priceEgp}
                  onChange={(e) => setPriceEgp(e.target.value)}
                  placeholder="599"
                />
                {quantityMode ? (
                  <InputField
                    id="stockQuantity"
                    type="number"
                    label={t('stockQuantity')}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder={t('stockQuantityPlaceholder')}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-ink">
                      {t('availabilityLabel')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={listingAvailable ? 'default' : 'outline'}
                        onClick={() => setListingAvailable(true)}
                      >
                        {t('availableListing')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!listingAvailable ? 'default' : 'outline'}
                        onClick={() => setListingAvailable(false)}
                      >
                        {t('unavailableListing')}
                      </Button>
                    </div>
                  </div>
                )}
                <InputField
                  id="productDescription"
                  label={t('productDescription')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('productDescriptionPlaceholder')}
                  containerClassName="sm:col-span-2"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-page/50 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {t('productDetails')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{formHint}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {template.map((field) => (
                    <InputField
                      key={field.key}
                      id={`attr-${field.key}`}
                      type={field.kind === 'number' ? 'number' : 'text'}
                      label={t(field.labelKey)}
                      value={templateValues[field.key] ?? ''}
                      onChange={(e) =>
                        setTemplateValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={
                        field.placeholderKey
                          ? t(field.placeholderKey)
                          : undefined
                      }
                    />
                  ))}
                </div>

                {customRows.map((row, index) => (
                  <div
                    key={`custom-${index}`}
                    className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <InputField
                      id={`custom-key-${index}`}
                      label={t('attrCustomKey')}
                      value={row.key}
                      onChange={(e) =>
                        setCustomRows((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, key: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <InputField
                      id={`custom-value-${index}`}
                      label={t('attrCustomValue')}
                      value={row.value}
                      onChange={(e) =>
                        setCustomRows((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, value: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-end"
                      onClick={() =>
                        setCustomRows((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      {t('delete')}
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCustomRows((prev) => [...prev, { key: '', value: '' }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('attrAddCustom')}
                </Button>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? t('saving') : t('addProduct')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {products.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center transition hover:border-brand/40 hover:bg-lavender/40"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <PackagePlus className="h-6 w-6" />
          </span>
          <span className="space-y-1">
            <span className="block text-sm font-semibold text-ink">
              {t('noProducts')}
            </span>
            <span className="block text-xs text-muted">{t('noProductsHint')}</span>
          </span>
        </button>
      ) : (
        <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const detailEntries = resolveAttributeEntries(
              (p.attributes ?? {}) as Record<
                string,
                string | number | boolean | string[]
              >,
              businessType,
            )
            const qty = p.stockQuantity ?? 0
            const isOut = quantityMode ? qty <= 0 : !p.inStock
            const isLow = quantityMode && qty > 0 && qty <= 5

            return (
              <article
                key={p.id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-surface p-4 transition',
                  isOut
                    ? 'border-danger/20 bg-danger/[0.02]'
                    : 'border-border hover:border-brand/25',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-base font-bold text-ink">
                      {p.name}
                    </h3>
                    <p className="text-lg font-semibold tabular-nums text-brand">
                      {p.priceEgp.toLocaleString()}{' '}
                      <span className="text-sm font-medium text-muted">
                        {t('egp')}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      isOut
                        ? 'bg-danger/10 text-danger'
                        : isLow
                          ? 'bg-alert/20 text-ink'
                          : 'bg-trust/10 text-trust',
                    )}
                  >
                    {quantityMode
                      ? isOut
                        ? t('outOfStockShort')
                        : t('qtyLeft', { count: String(qty) })
                      : p.inStock
                        ? t('availableListing')
                        : t('unavailableListing')}
                  </span>
                </div>

                {p.description ? (
                  <p className="line-clamp-2 text-sm leading-6 text-muted">
                    {p.description}
                  </p>
                ) : null}

                {detailEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detailEntries.map((entry) => (
                      <span
                        key={entry.key}
                        className="inline-flex max-w-full items-center gap-1 rounded-lg bg-page px-2 py-1 text-[11px] text-muted"
                      >
                        <span className="font-semibold text-ink">
                          {entry.labelKey ? t(entry.labelKey) : entry.key}
                        </span>
                        <span className="truncate">{entry.value}</span>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                  {quantityMode ? (
                    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-page p-0.5">
                      <button
                        type="button"
                        disabled={updateStockMut.isPending || qty <= 0}
                        onClick={() =>
                          updateStockMut.mutate({
                            id: p.id,
                            stockQuantity: Math.max(0, qty - 1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40"
                        aria-label="-1"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-ink">
                        {qty}
                      </span>
                      <button
                        type="button"
                        disabled={updateStockMut.isPending}
                        onClick={() =>
                          updateStockMut.mutate({
                            id: p.id,
                            stockQuantity: qty + 1,
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40"
                        aria-label="+1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateStockMut.isPending}
                      onClick={() =>
                        updateStockMut.mutate({
                          id: p.id,
                          inStock: !p.inStock,
                        })
                      }
                    >
                      {p.inStock
                        ? t('availableListing')
                        : t('unavailableListing')}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => deleteMut.mutate(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('delete')}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
