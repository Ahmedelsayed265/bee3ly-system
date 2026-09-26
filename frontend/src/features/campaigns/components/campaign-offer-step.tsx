import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { draftCampaignCopy, fetchProducts } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

type CampaignOfferStepProps = {
  offer: string;
  onOfferChange: (value: string) => void;
  productId: string;
  onProductChange: (value: string) => void;
  adCopy: string;
  onAdCopyChange: (value: string) => void;
  onNext: () => void;
};

export function CampaignOfferStep({
  offer,
  onOfferChange,
  productId,
  onProductChange,
  adCopy,
  onAdCopyChange,
  onNext,
}: CampaignOfferStepProps) {
  const { t } = useLocale();
  const productsQuery = useQuery({
    queryKey: ['products', 1, 50],
    queryFn: () => fetchProducts(1, 50),
  });
  const products = productsQuery.data?.products ?? [];
  const generateCopy = useMutation({
    mutationFn: () => draftCampaignCopy({ name: offer.trim(), productId }),
    onSuccess: (copy) => onAdCopyChange(copy),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-ink text-lg font-semibold">
        {t('campaignStepOffer')}
      </h2>
      <InputField
        id="campaign-name"
        label={t('campaignName')}
        value={offer}
        onChange={(e) => onOfferChange(e.target.value)}
        placeholder={t('campaignNamePlaceholder')}
      />

      {productsQuery.isSuccess && products.length === 0 ? (
        <div className="border-border bg-page rounded-xl border px-4 py-4">
          <p className="text-muted text-sm">{t('campaignNoProducts')}</p>
          <Button asChild className="mt-3" variant="outline">
            <Link to={paths.products}>{t('campaignAddProduct')}</Link>
          </Button>
        </div>
      ) : (
        <SelectField
          id="campaign-product"
          label={t('campaignProductLabel')}
          value={productId}
          onValueChange={onProductChange}
          placeholder={t('campaignProductPlaceholder')}
          disabled={productsQuery.isLoading}
          options={products.map((product) => ({
            value: product.id,
            label: `${product.name} · ${product.priceEgp.toLocaleString()} ${t('egp')}`,
          }))}
        />
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Label htmlFor="campaign-ad-copy" className="mb-0">
            {t('campaignAdCopyLabel')}
          </Label>
          <button
            type="button"
            disabled={
              generateCopy.isPending || offer.trim().length < 2 || !productId
            }
            onClick={() => generateCopy.mutate()}
            className="text-brand hover:bg-brand/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-40"
          >
            <Sparkles
              className={`size-3.5 ${generateCopy.isPending ? 'animate-pulse' : ''}`}
            />
            {t('campaignGenerateCopy')}
          </button>
        </div>
        <textarea
          id="campaign-ad-copy"
          value={adCopy}
          onChange={(e) => onAdCopyChange(e.target.value)}
          placeholder={t('campaignAdCopyPlaceholder')}
          rows={5}
          className="border-border bg-input text-ink placeholder:text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-4 py-3 text-sm transition outline-none focus:ring-2"
        />
        {generateCopy.isError ? (
          <p className="text-danger mt-2 text-sm">
            {t('campaignGenerateCopyFailed')}
          </p>
        ) : null}
      </div>

      <Button disabled={offer.trim().length < 2 || !productId} onClick={onNext}>
        {t('next')}
      </Button>
    </div>
  );
}
