import { BarChart2 } from 'lucide-react'
import SectionCard from '../../ui/SectionCard'
import { useLanguage } from '../../../hooks/useLanguage'

export default function CashFlowEmptyState({ onEditFinancialInfo }) {
  const { t } = useLanguage()

  return (
    <SectionCard bodyClassName="px-8 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-hig-gray-6">
        <BarChart2 size={22} className="text-hig-text-secondary" />
      </div>
      <div className="mb-2 text-hig-title3 font-semibold">{t('cashflow.noFinancialData')}</div>
      <p className="mx-auto mb-5 max-w-md text-hig-footnote text-hig-text-secondary">
        {t('cashflow.enterDataPrompt')}
      </p>
      {onEditFinancialInfo ? (
        <button onClick={onEditFinancialInfo} className="hig-btn-primary">
          {t('cashflow.setupFinancialInfo')}
        </button>
      ) : null}
    </SectionCard>
  )
}
