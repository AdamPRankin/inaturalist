#encoding: utf-8
require "rubygems"
require "trollop"

OPTS = Trollop::options do
    banner <<-EOS

Check translations for missing variables and the like.

Usage:

  rails runner tools/i18nqa.rb

where [options] are:
EOS
  opt :debug, "Print debug statements", :type => :boolean, :short => "-d"
  opt :locale, "Only check this locale", type: :string, short: "-l"
  opt :filter, "Filter keys by this substring", type: :string, short: "-f"
  opt :level, "Show only this error level.", type: :string
end

@levels = %w(error warning)
if OPTS.level
  if @levels.include?( OPTS.level )
    @levels = [OPTS.level]
  else
    Trollop::die :level, "must be `error` or `warning`"
  end
end

def traverse( obj, key = nil, &blk )
  case obj
  when Hash
    obj.each {|k,v| traverse( v, [key, k].compact.join( "." ), &blk ) }
  # when Array
  #   obj.each {|v| traverse(v, &blk) }
  else
    blk.call( obj, key )
  end
end

data = {}

Dir.glob( "config/locales/*.yml" ).each do |path|
  next if path =~ /qqq.yml/
  next if OPTS.locale && path !~ /#{OPTS.locale}.yml/ && path !~ /en.yml/
  traverse( YAML.load_file( path ) ) do |translation, key|
    data[key] = translation
  end
end

problems = {}

data.each do |key, translation|
  next if key =~ /^en\./
  next if OPTS.filter && key !~ /#{OPTS.filter}/
  puts "#{key}: #{translation}" if OPTS.debug
  locale = key[/^(.+?)\./, 1]
  en_key = key.sub( "#{locale}.", "en." )
  # puts "\tdata[#{en_key}]: #{data[en_key]}"
  if translation.is_a?( String ) && @levels.include?( "error" )
    translation.scan( /\{\{.+?\=.+?\}\}/ ).each do |match|
      problems[key] = problems[key] || []
      problems[key] << "**ERROR:** Must not include `#{match}`"
    end
  end
  if key =~ /^#{locale}\.i18n\.inflections\.gender\.$/
    problems[key] = problems[key] || []
      problems[key] << "**ERROR:** Gender inflection with a blank key"
  end
  next unless data[en_key]
  if data[en_key].is_a?( Array )
    if data[en_key].size > translation.size && @levels.include?( "warning" )
      problems[key] = problems[key] || []
      problems[key] << "WARNING: Missing #{data[en_key].size - translation.size} items"
    end
    next
  elsif !data[en_key].is_a?( String )
    next
  end
  if translation.blank? && @levels.include?( "warning" )
    problems[key] = problems[key] || []
    problems[key] << "WARNING: Translation is blank"
    next
  end
  variables = data[en_key].scan( /%{.+?}/ )
  variables.each do |variable|
    # puts "\tVariable: #{variable}"
    if translation !~ /#{variable}/ && @levels.include?( "warning" )
      problems[key] = problems[key] || []
      problems[key] << "WARNING: Should include `#{variable}`"
    end
  end
  bad_variables = translation.scan( /%{.+?}/ )
  bad_variables.each do |bad_variable|
    if data[en_key] !~ /#{bad_variable.encode( "utf-8" )}/ && @levels.include?( "error" )
      problems[key] = problems[key] || []
      problems[key] << "**ERROR:** Must not include `#{bad_variable}`"
    end
  end

  if key =~ /#{locale}\..+\.one$/
    other_key = key.sub( /\.one$/ , ".other" )
    if !data[other_key] && @levels.include?( "error" )
      problems[other_key] = problems[other_key] || []
      problems[other_key] << "**ERROR:** Missing part of a plural key"
    end
  end

  if key =~ /#{locale}\..+\.other$/
    one_key = key.sub( /\.other$/ , ".one" )
    if !data[one_key] && @levels.include?( "error" )
      problems[one_key] = problems[one_key] || []
      problems[one_key] << "**ERROR:** Missing part of a plural key"
    end
  end
end

problems.each do |key, a|
  data[key] = data[key].strip if data[key].is_a?( String )
  if data[key] =~ /\n/
    puts "* `#{key}`:"
    puts "  ```html"
    puts "  #{data[key].split( "\n" ).join( "\n  " )}"
    puts "  ```"
  else
    puts "* `#{key}`: `#{data[key]}`"
  end
  a.each do |problem|
    puts "  - [ ] #{problem}"
  end
end