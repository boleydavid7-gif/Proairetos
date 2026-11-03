Pod::Spec.new do |s|
  s.name = 'AskesisBridge'
  s.version = '0.1.0'
  s.summary = 'Optional native device bridge for Askesis.'
  s.description = 'Protocol-v1 capability discovery for the Proairetos Askesis Capacitor app.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Proairetos'
  s.homepage = 'https://github.com/boleydavid7-gif/Proairetos'
  s.source = { :git => 'https://github.com/boleydavid7-gif/Proairetos.git', :tag => s.version.to_s }
  s.ios.deployment_target = '15.0'
  s.source_files = 'ios/Sources/AskesisBridgePlugin/**/*.swift'
  s.dependency 'Capacitor'
end
