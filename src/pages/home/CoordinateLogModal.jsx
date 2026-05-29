import { Send } from 'lucide-react';
import ModalShell from '../../components/ModalShell';

export default function CoordinateLogModal({
  coordinateLogMessage,
  coordinateLogStatus,
  coordinateLogUrl,
  onClose,
  onSubmit,
  onUrlChange,
  selectedCoordinate,
}) {
  return (
    <ModalShell ariaLabel="탐사 로그 작성" className="coordinate-log-modal">
      <form className="coordinate-log-form" onSubmit={onSubmit}>
        <div className="coordinate-log-form-head">
          <span>MISSION LOG INPUT</span>
          <button
            aria-label="탐사 로그 작성 닫기"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <h3>{selectedCoordinate.label} 탐사 로그</h3>
        <p>
          선택한 좌표에 연결할 인스타 서평 주소를 입력하면 탐사 로그 노션 DB에 저장됩니다.
        </p>
        <label>
          <span>인스타 서평 주소</span>
          <input
            autoFocus
            onChange={event => onUrlChange(event.target.value)}
            placeholder="https://www.instagram.com/p/..."
            type="url"
            value={coordinateLogUrl}
          />
        </label>
        <div className="coordinate-log-actions">
          <p className={`coordinate-log-message is-${coordinateLogStatus}`}>
            {coordinateLogStatus === 'idle' && '저장 후 탐사 로그 페이지에서 함께 보입니다.'}
            {coordinateLogStatus === 'submitting' && '노션으로 신호를 전송 중입니다.'}
            {coordinateLogStatus !== 'idle' && coordinateLogStatus !== 'submitting' && coordinateLogMessage}
          </p>
          <button type="submit" disabled={coordinateLogStatus === 'submitting'}>
            <Send size={16} />
            {coordinateLogStatus === 'submitting' ? '저장 중' : '노션에 저장'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
