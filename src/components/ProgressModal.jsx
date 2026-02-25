import { t } from '../i18n';

export default function ProgressModal({ logs, done, uiLang }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-title">{done ? t('progress.done', uiLang) : t('progress.title', uiLang)}</div>
        <div className="progress-log">
          {logs.map(function(m, i) {
            var cls = 'log-line';
            if (m.indexOf('❌') === 0) cls += ' log-error';
            else if (m.indexOf('⚠') === 0) cls += ' log-warn';
            else if (m.indexOf('✅') === 0 || m.indexOf('🎉') === 0) cls += ' log-success';
            else if (m.indexOf('   ') === 0) cls += ' log-detail';
            return <div key={i} className={cls}>{m}</div>;
          })}
          {!done && <div className="log-line log-detail" style={{ opacity: 0.5 }}>{t('progress.processing', uiLang)}</div>}
        </div>
      </div>
    </div>
  );
}
