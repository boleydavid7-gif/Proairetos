// Google Drive, Dropbox or OneDrive return here after the person allows Proairetos its folder. The code goes on to
// Proairetos's account page in the address's fragment, which is never sent to any server.
(function () {
  var query = new URLSearchParams(location.search);
  var out = new URLSearchParams();
  ['code', 'state', 'error'].forEach(function (name) {
    var value = query.get(name);
    if (value) out.set(name === 'code' ? 'storage' : name === 'error' ? 'storage-error' : 'storage-state', value);
  });
  location.replace('/?open=account#' + out.toString());
})();
