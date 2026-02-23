import { useState } from 'react';

export default function AIChat({ onSend, disabled, lastResponse }) {
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
          placeholder={disabled ? 'Processing...' : 'AI: "Add a lifestyle section before the product grid..."'}
          disabled={disabled}
        />
        <button className="btn btn-primary ai-chat-send" onClick={handleSend} disabled={disabled || !text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
