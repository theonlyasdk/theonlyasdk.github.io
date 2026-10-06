#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'uri'

ROOT = File.expand_path('..', __dir__)
DATA_FILES = {
  File.join(ROOT, '_data', 'goodies.yml') => %w[name category description image],
  File.join(ROOT, '_data', 'page_designs.yml') => %w[name category description image pdf]
}.freeze
LOCAL_REF_FIELDS = %w[image iframe_url pdf].freeze

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
$total = 0
DATA_FILES.each do |data_file, fields|
  label = File.basename(data_file, '.yml')
  items = YAML.safe_load(File.read(data_file), permitted_classes: [], aliases: false)
  unless items.is_a?(Array) && !items.empty?
    abort "Expected #{data_file} to contain at least one entry"
  end

  items.each_with_index do |item, index|
    fields.each do |field|
      warn "#{label} ##{index + 1} is missing #{field}" unless item[field].is_a?(String) && !item[field].empty?
      $failures += 1 unless item[field].is_a?(String) && !item[field].empty?
    end

    LOCAL_REF_FIELDS.each do |field|
      next unless item[field].is_a?(String) && !item[field].empty?

      if (path = local_path(item[field]))
        require_file(File.join(ROOT, path), "#{field} for #{item['name'] || "#{label} ##{index + 1}"}")
      end
    end
  end
  $total += items.length
end

about = File.read(File.join(ROOT, '_tabs', 'about.html'))
abort 'About page must load the external goodies module' unless about.include?('/assets/js/goodies.js')
abort 'About page must expose serialized goodies data' unless about.include?('id="goodies-data"')
abort 'About page must load the shared collection-grid module first' unless about.index('/assets/js/collection-grid.js')&.<(about.index('/assets/js/goodies.js'))

designs_page = File.read(File.join(ROOT, 'resources', 'page-designs.html'))
abort 'Designs page must load the external page-designs module' unless designs_page.include?('/assets/js/page-designs.js')
abort 'Designs page must expose serialized designs data' unless designs_page.include?('id="pdesigns-data"')
abort 'Designs page must load the shared collection-grid module first' unless designs_page.index('/assets/js/collection-grid.js')&.<(designs_page.index('/assets/js/page-designs.js'))

if $failures.positive?
  abort "Site validation failed with #{$failures} error(s)"
end

puts "Validated #{$total} entries and all local references."
