// src/SongSearch.jsx

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

// A simple debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

export default function SongSearch({ onSongSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const performSearch = async (searchQuery) => {
    if (searchQuery.length < 3) {
      setResults([])
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query: searchQuery }
      })
      if (error) throw error
      setResults(data)
    } catch (error) {
      console.error('Error searching songs:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Use useCallback to memoize the debounced function
  const debouncedSearch = useCallback(debounce(performSearch, 500), [])

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleSelect = (song) => {
    onSongSelect(song)
    setQuery(`${song.title} - ${song.artist}`) // Update input to show selection
    setResults([]) // Hide dropdown
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a song..."
        style={{ width: '100%' }}
      />
      {isLoading && <div style={{ padding: '5px' }}>Searching...</div>}
      {results.length > 0 && (
        <ul style={{
          position: 'absolute',
          width: '100%',
          border: '1px solid #ccc',
          backgroundColor: 'white',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          zIndex: 1000,
        }}>
          {results.map(song => (
            <li 
              key={song.uri}
              onClick={() => handleSelect(song)}
              style={{ display: 'flex', alignItems: 'center', padding: '5px', cursor: 'pointer' }}
            >
              <img src={song.thumbnail} alt="album art" style={{ width: '40px', height: '40px', marginRight: '10px' }} />
              <div>
                <strong style={{ display: 'block' }}>{song.title}</strong>
                <span>{song.artist}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}