import { CheckCircle2, Save } from 'lucide-react';

const LogSubmitActionBar = ({
  canSubmit,
  className = '',
  formId,
  isSubmitting,
  submitStatus,
  title,
}) => (
  <div className={`sticky-submit-bar panel ${className}`.trim()}>
    <div className="sticky-readout mono">
      <CheckCircle2 size={13} />
      <span>{submitStatus}</span>
    </div>
    <button
      type="submit"
      className="sticky-submit-btn"
      disabled={!canSubmit}
      form={formId}
    >
      <Save size={16} />
      <span className="mono">{isSubmitting ? '송신 중...' : title ? '탐사보고서 제출' : '작품명 필요'}</span>
    </button>
  </div>
);

export default LogSubmitActionBar;
