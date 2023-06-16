'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Honeybadger } from "@honeybadger-io/react";

export default function Error({
      error,
      reset,
  }: {
    error: Error;
    reset: () => void;
}) {
    useEffect(() => {
        Honeybadger.notify(error);
    }, [error]);

    return (
        <div>
            <h2>Something went wrong!</h2>
            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Try again
            </button>
        </div>
    );
}
