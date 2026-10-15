// Google Drive, Dropbox or OneDrive return here after the person allows Proairetos its folder (or Theoria a library
// folder). The code goes on to the app's page in the address's fragment, which is never sent to any server.
(function () {
  var query = new URLSearchParams(location.search);
  var out = new URLSearchParams();
  ['code', 'state', 'error'].forEach(function (name) {
    var value = query.get(name);
    if (value) out.set(name === 'code' ? 'storage' : name === 'error' ? 'storage-error' : 'storage-state', value);
  });
  // Theoria's library folder marks its state, and goes back to Theoria's settings.
  var place = (query.get('state') || '').indexOf('theoria.') === 0 ? '/theoria/?open=settings' : '/?open=account';
  location.replace(place + '#' + out.toString());
})();
