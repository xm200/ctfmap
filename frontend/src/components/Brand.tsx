export function Brand() {
  return (
    <a className="brand" href="/" onClick={(event) => {
      event.preventDefault();
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }}>
      <span className="brand-mark"><i /><i /><i /></span>
      <span>
        <strong>CTF<span>MAP</span></strong>
        <small>КАРТА CTF РОССИИ</small>
      </span>
    </a>
  );
}
