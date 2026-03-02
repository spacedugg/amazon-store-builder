import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';

export default function ProgressModal({ logs, done, uiLang }) {
  var logEndRef = useRef(null);
  var [elapsed, setElapsed] = useState(0);

  // Timer that counts up every second
  useEffect(function() {
    if (done) return;
    var start = Date.now();
    var interval = setInterval(function() {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return function() { clearInterval(interval); };
  }, [done]);

  // Auto-scroll to bottom
  useEffect(function() {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  var hasError = logs.some(function(m) { return m.indexOf('ERROR:') >= 0 || m.indexOf('Error:') >= 0; });
  var formatTime = function(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m > 0 ? m + 'm ' + sec + 's' : sec + 's';
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-title">
          {done
            ? (hasError ? 'Generation Failed' : t('progress.done', uiLang))
            : t('progress.title', uiLang)}
          {!done && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: '#64748b' }}>{formatTime(elapsed)}</span>}
        </div>
        <div className="progress-log" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {logs.map(function(m, i) {
            var cls = 'log-line';
            if (m.indexOf('ERROR:') >= 0 || m.indexOf('Error:') >= 0) cls += ' log-error';
            else if (m.indexOf('WARNING:') >= 0 || m.indexOf('Warning:') >= 0) cls += ' log-warn';
            else if (m.indexOf('complete') >= 0 || m.indexOf('Complete') >= 0) cls += ' log-success';
            else if (m.indexOf('   ') === 0) cls += ' log-detail';
            return <div key={i} className={cls}>{m}</div>;
          })}
          {!done && (
            <div className="log-line log-detail" style={{ opacity: 0.5 }}>
              {elapsed > 60
                ? 'Still processing... (' + formatTime(elapsed) + ') — AI generation can take a few minutes for large catalogs.'
                : t('progress.processing', uiLang)}
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
