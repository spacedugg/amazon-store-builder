import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';

export default function ProgressModal({ logs, done, uiLang, onClose, onRetry, onStop, onResume }) {
  var logEndRef = useRef(null);
  var [elapsed, setElapsed] = useState(0);
  var [dots, setDots] = useState('');
  var [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(function() {
    if (done) return;
    var start = Date.now();
    var interval = setInterval(function() {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return function() { clearInterval(interval); };
  }, [done]);

  useEffect(function() {
    if (done) return;
    var interval = setInterval(function() {
      setDots(function(d) { return d.length >= 3 ? '' : d + '.'; });
    }, 500);
    return function() { clearInterval(interval); };
  }, [done]);

  useEffect(function() {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  var hasError = logs.some(function(m) { return m.indexOf('ERROR:') >= 0 || m.indexOf('Error:') >= 0 || m.indexOf('failed') >= 0; });
  var isApiLimitError = logs.some(function(m) { return m.indexOf('429') >= 0 || m.indexOf('rate') >= 0 || m.indexOf('credit') >= 0 || m.indexOf('quota') >= 0; });
  var hasCriticalWarning = logs.some(function(m) { return m.indexOf('CRITICAL:') >= 0; });

  var formatTime = function(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m > 0 ? m + 'm ' + sec + 's' : sec + 's';
  };

  var getStatusMessage = function() {
    var lastLog = logs.length > 0 ? logs[logs.length - 1] : '';
    if (lastLog.indexOf('Product') >= 0 && lastLog.indexOf('/') >= 0) return 'Analyzing products individually' + dots;
    if (lastLog.indexOf('Page') >= 0 && lastLog.indexOf('/') >= 0) return 'Analyzing website pages' + dots;
    if (lastLog.indexOf('CI:') >= 0) return 'Analyzing brand CI images' + dots;
    if (lastLog.indexOf('PHASE') >= 0) return lastLog.replace(/═/g, '').trim() + dots;
    if (elapsed > 300) return 'Still working — large catalogs need more time' + dots;
    return 'Processing' + dots;
  };

  // Prevent accidental close — click outside does NOTHING
  var handleOverlayClick = function(e) {
    e.stopPropagation();
    // Do nothing — modal stays open
  };

  var handleCancel = function() {
    if (confirmCancel) {
      // Second click — actually cancel
      setConfirmCancel(false);
      if (onStop) onStop();
    } else {
      // First click — ask for confirmation
      setConfirmCancel(true);
      setTimeout(function() { setConfirmCancel(false); }, 5000); // reset after 5s
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }} onClick={handleOverlayClick}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={function(e) { e.stopPropagation(); }}>
        <div className="modal-title">
          {done
            ? (hasError ? 'Generation paused' : t('progress.done', uiLang))
            : t('progress.title', uiLang)}
          {!done && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: '#64748b' }}>{formatTime(elapsed)}</span>}
        </div>

        {!done && (
          <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              width: '100%',
            }} />
          </div>
        )}

        <div className="progress-log" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {logs.map(function(m, i) {
            var cls = 'log-line';
            if (m.indexOf('ERROR:') >= 0 || m.indexOf('Error:') >= 0 || m.indexOf('failed') >= 0) cls += ' log-error';
            else if (m.indexOf('WARNING:') >= 0) cls += ' log-warn';
            else if (m.indexOf('complete') >= 0 || m.indexOf('Complete') >= 0 || m.indexOf('passed') >= 0) cls += ' log-success';
            else if (m.indexOf('   ') === 0) cls += ' log-detail';
            return <div key={i} className={cls}>{m}</div>;
          })}
          {!done && (
            <div className="log-line log-detail" style={{ opacity: 0.6, fontStyle: 'italic' }}>
              {getStatusMessage()}
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        {/* Stop button during generation — with double-confirm */}
        {!done && onStop && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={handleCancel}
              style={{ background: confirmCancel ? '#991b1b' : '#ef4444', color: '#fff', borderColor: confirmCancel ? '#991b1b' : '#ef4444', fontWeight: 700, padding: '6px 18px' }}>
              {confirmCancel ? 'Wirklich abbrechen?' : 'Abbrechen'}
            </button>
          </div>
        )}

        {/* When done with error — show Resume + Close */}
        {done && hasError && (
          <div style={{ padding: '10px 0 0', borderTop: '1px solid #e2e8f0', marginTop: 10 }}>
            {isApiLimitError && (
              <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>
                API-Credits aufgebraucht. Lade auf und klicke dann "Fortfahren".
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {onResume && (
                <button className="btn" onClick={onResume}
                  style={{ background: '#22c55e', color: '#fff', borderColor: '#22c55e', fontWeight: 700, padding: '6px 18px' }}>
                  Fortfahren
                </button>
              )}
              {onRetry && (
                <button className="btn" onClick={onRetry}
                  style={{ background: '#f59e0b', color: '#fff', borderColor: '#f59e0b', fontWeight: 700 }}>
                  Von vorne starten
                </button>
              )}
              <button className="btn" onClick={onClose}
                style={{ background: '#64748b', color: '#fff', borderColor: '#64748b' }}>
                Schliessen
              </button>
            </div>
          </div>
        )}

        {/* When done without error — just OK */}
        {done && !hasError && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}
              style={{ background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}>
              OK
            </button>
          </div>
        )}

        <style>{'\
          @keyframes shimmer {\
            0% { background-position: 200% 0; }\
            100% { background-position: -200% 0; }\
          }\
        '}</style>
      </div>
    </div>
  );
}
