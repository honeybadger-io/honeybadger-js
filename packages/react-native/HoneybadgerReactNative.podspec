require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "HoneybadgerReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  Honeybadger.io for React Native
                   DESC
  s.homepage     = "https://honeybadger.io"
  s.license      = "MIT"
  s.author       = { "Honeybadger" => "support@honeybadger.io" }
  s.platform     = :ios, "9.0"

  s.source       = { :git => "https://github.com/honeybadger-io/honeybadger-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,c,m,swift}"
  s.requires_arc = true

  s.dependency 'React'
  # ...
  # s.dependency "..."
end
