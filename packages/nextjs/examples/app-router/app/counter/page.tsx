'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Counter() {
    const [count, setCount] = useState(0);
    const params = useSearchParams();
    const shouldFail = params.get('fail') === 'true';
    if (shouldFail) {
        throw new Error('will not render component - fail === true')
    }

    const doSomething = function incrementPlus() {
        // console.log(window.something.something)
        setCount(count + 1)
    }

    return (
        <div>
            <p>You clicked {count} times</p>
            <button onClick={() => doSomething()}>Click me</button>
        </div>
    );
}
