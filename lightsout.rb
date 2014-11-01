#!/usr/bin/env ruby

# lightsout.rb
# Copyright (c) 2014 AKIYAMA Kouhei
# This software is released under the MIT License.

BOARD_W = 7
BOARD_H = 7
TREASURE_CONTENT_TYPE = 'image/jpeg'
TREASURE_FILE_PATH = 'example/common/bg.jpg'

# -------------------
BASE64URLCHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

require 'cgi'
require 'date'

class Board
  def initialize(w, h)
    @w = w
    @h = h
    @cells = Array.new(BOARD_W*BOARD_H, false)
  end
  def get_cell(x, y)
    @cells[x+y*@w]
  end
  def flip_on(x, y)
    if not (x >= 0 && y >= 0 && x < @w && y < @h) then
      return
    end
    index = x + y * @w
    @cells[index] = !@cells[index];
    @cells[index-1] = !@cells[index-1] if x > 0
    @cells[index-@w] = !@cells[index-@w] if y > 0
    @cells[index+1] = !@cells[index+1] if x+1 < @w
    @cells[index+@w] = !@cells[index+@w] if y+1 < @h
  end
  def is_solved()
    not @cells.include?(true);
  end
  def fill(b)
    @cells.fill(b)
  end
  def randomize(seed)
    srand(seed)
    fill(false)
    begin
      for y in 0..@h-1 do
        for x in 0..@w-1 do
          flip_on(x, y) if rand < 0.5
        end
      end
    end while is_solved()
    return self
  end
  def to_s
    r = ""
    for y in 0..@h-1 do
      for x in 0..@w-1 do
        r << if get_cell(x, y) then '#' else '.' end
      end
      r << ' '
    end
    r
  end
end

def get_current_time()
  DateTime.now.strftime('%Q').to_i
end

def get_seed(ip_addr, time)
  ip_addr ^ (time & 0xffffffff) ^ ((time>>32)&0xffffffff)
end

def error(text)
  print "Content-Type: text/plain\n\n"
  print "Error:" + text + "\n"
end

def judge(answer, pubtime, ip_addr)
  if answer.length > 10000 || pubtime.length > 20 then
    error("invalid arguments")
    return
  end

  pub_time = pubtime.to_i
  curr_time = get_current_time
  delta_time = curr_time - pub_time 
  if not (delta_time >= 0 && delta_time < 60*60*1000)
    error("out of time")
    return
  end

  flips = answer.chars.map {|c|
    n = BASE64URLCHARS.index(c) || 0
    (0..5).map{|i| (n>>i)&1 != 0}}.inject(:+)
  if flips.length < BOARD_W*BOARD_H then
    error("too short answer")
    return
  end

  board = Board.new(BOARD_W, BOARD_H).randomize(get_seed(ip_addr, pub_time))
  for y in 0..BOARD_H-1 do
    for x in 0..BOARD_W-1 do
      board.flip_on(x, y) if flips[x+y*BOARD_W]
    end
  end

  if board.is_solved then
    begin
      open(TREASURE_FILE_PATH){|file|
        print "Content-Type: " + TREASURE_CONTENT_TYPE + "\n"
        print "\n"
        $stdout.binmode
        $stdout.write(file.read)
      }
    rescue => e
      error(e.to_s)
    end
  else
    error("not solved")
  end
end

def make_problem(ip_addr)
  curr_time = get_current_time

  board = Board.new(BOARD_W, BOARD_H).randomize(get_seed(ip_addr, curr_time))
  print "Content-Type: text/plain\n\n"
  print curr_time.to_s + "\n"
  print board.to_s + "\n"
end


cgi = CGI.new
ip_addr = cgi.remote_addr.split('.').inject(0) {|r,v| (r << 8) + v.to_i}

if cgi.has_key?('a') then
  answer = cgi["a"][0]
  pubtime = cgi["t"][0]
  judge(answer, pubtime, ip_addr)
else
  make_problem(ip_addr)
end
