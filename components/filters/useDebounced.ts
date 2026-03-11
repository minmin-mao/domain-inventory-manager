import { useEffect, useState } from 'react'

export function useDebounced<T>(value: T, ms = 300) {
  const [deb, setDeb] = useState(value);

  useEffect(()=> {
    const id = setTimeout (() => setDeb(value), ms);
    return() => clearTimeout(id);
  }, [value,ms]);
  return deb;
}