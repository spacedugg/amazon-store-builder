import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';

export default function ProgressModal({ logs, done, uiLang }) {
  var logEndRef = useRef(null);
  var [elapsed, setElapsed] = useState(0);
  var [dots, setDots] = useState('');

  // Timer that counts up every second
  useEffect(function() {
    if (done) return;
    var start = Date.now();
    var interval = setInterval(function() {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return function() { clearInterval(interval); };
  }, [done]);

  // Animated dots for heartbeat
  useEffect(function() {
    if (done) return;
    var interval = setInterval(function() {
      setDots(function(d) { return d.length >= 3 ? '' : d + '.'; });
    }, 500);
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

  // Phase-aware status message based on elapsed time and last log
  var getStatusMessage = function() {
    var lastLog = logs.length > 0 ? logs[logs.length - 1] : '';
    if (lastLog.indexOf('Scraping') >= 0 || lastLog.indexOf('scraping') >= 0) {
      if (elapsed > 120) return 'Scraping is taking longer than usual — Bright Data is still working' + dots;
      if (elapsed > 60) return 'Still scraping product data from Amazon' + dots;
      return 'Fetching product data from Amazon' + dots;
    }
    if (lastLog.indexOf('AI analyz') >= 0 || lastLog.indexOf('AI design') >= 0 || lastLog.indexOf('Structure planned') >= 0) {
      if (elapsed > 180) return 'AI is still generating — complex stores can take several minutes' + dots;
      if (elapsed > 120) return 'AI is building your store pages' + dots;
      return 'AI is designing your store' + dots;
    }
    if (elapsed > 300) return 'Still working — large catalogs need more time' + dots;
    if (elapsed > 180) return 'AI generation in progress — almost there' + dots;
    if (elapsed > 120) return 'Still processing — this is normal for larger stores' + dots;
    if (elapsed > 60) return 'Generation in progress' + dots;
    return t('progress.processing', uiLang) + dots;
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

        {/* Animated progress bar */}
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
            if (m.indexOf('ERROR:') >= 0 || m.indexOf('Error:') >= 0) cls += ' log-error';
            else if (m.indexOf('WARNING:') >= 0 || m.indexOf('Warning:') >= 0) cls += ' log-warn';
            else if (m.indexOf('complete') >= 0 || m.indexOf('Complete') >= 0) cls += ' log-success';
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

        {/* CSS for shimmer animation */}
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
