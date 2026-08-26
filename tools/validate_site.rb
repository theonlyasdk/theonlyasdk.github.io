#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'uri'

ROOT = File.expand_path('..', __dir__)
DATA_FILE = File.join(ROOT, '_data', 'goodies.yml')

def local_path(value)
  return nil if value.nil? || value.match?(%r{\A(?:[a-z]+:)?//}i)

  value.sub(%r{\A/}, '').split(/[?#]/, 2).first
end

def require_file(path, label)
  return if File.file?(path)

  warn "Missing #{label}: #{path.sub(ROOT + File::SEPARATOR, '')}"
  $failures += 1
end

$failures = 0
goodies = YAML.safe_load(File.read(DATA_FILE), permitted_classes: [], aliases: false)
unless goodies.is_a?(Array) && !goodies.empty?
  abort 'Expected _data/goodies.yml to contain at least one goodie'
end

goodies.each_with_index do |goodie, index|
  %w[name category description image].each do |field|
    warn "Goodie ##{index + 1} is missing #{field}" unless goodie[field].is_a?(String) && !goodie[field].empty?
    $failures += 1 unless goodie[field].is_a?(String) && !goodie[field].empty?
  end

  if (path = local_path(goodie['image']))
    require_file(File.join(ROOT, path), "image for #{goodie['name'] || "goodie ##{index + 1}"}")
  end

  if (path = local_path(goodie['iframe_url']))
    require_file(File.join(ROOT, path), "demo for #{goodie['name'] || "goodie ##{index + 1}"}")
  end
end

about = File.read(File.join(ROOT, '_tabs', 'about.html'))
abort 'About page must load the external goodies module' unless about.include?("/assets/js/goodies.js")
abort 'About page must expose serialized goodies data' unless about.include?('id="goodies-data"')

if $failures.positive?
  abort "Site validation failed with #{$failures} error(s)"
end

puts "Validated #{goodies.length} goodies and all local references."
