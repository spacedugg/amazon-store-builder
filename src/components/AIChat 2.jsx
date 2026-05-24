import { useState } from 'react';
import { t } from '../i18n';

export default function AIChat({ onSend, disabled, lastResponse, uiLang }) {
  var [text, setText] = useState('');

  var handleSend = function() {
    var cmd = text.trim();
    if (!cmd || disabled) return;
    onSend(cmd);
    setText('');
  };

  return (
    <div className="ai-chat">
      {lastResponse && (
        <div className="ai-chat-response">{lastResponse}</div>
      )}
      <div className="ai-chat-input-row">
        <input
          className="ai-chat-input"
          value={text}
          onChange={function(e) { setText(e.target.value); }}
          onKeyDown={function(e) { if (e.key === 'Enter') handleSend(); }}
          placeholder={disabled ? t('chat.processing', uiLang) : t('chat.placeholder', uiLang)}
          disabled={disabled}
        />
        <button className="btn btn-primary ai-chat-send" onClick={handleSend} disabled={disabled || !text.trim()}>
          {t('chat.send', uiLang)}
        </button>
      </div>
    </div>
  );
}
