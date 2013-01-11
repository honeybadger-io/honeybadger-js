
begin
  require 'jasmine'
  load 'jasmine/tasks/jasmine.rake'
  Jasmine.config.add_rack_path('/__vendor__', lambda { Rack::File.new('vendor') })
rescue LoadError
  task :jasmine do
    abort "Jasmine is not available. In order to run jasmine, you must: (sudo) gem install jasmine"
  end
end
