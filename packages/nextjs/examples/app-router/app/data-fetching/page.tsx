import { NextRequest } from "next/server";

async function getData(fail: boolean = false) {
    let res;
    if (fail) {
        res = await fetch('https://reqres.in/api/login', {
            method: 'POST',
            body: JSON.stringify({
                "username": "string",
                "email": "string",
                "password": "string"
            })
        });
    }
    else {
        res = await fetch('https://reqres.in/api/users?page=1')
    }

    const result = await res.json();

    // Recommendation: handle errors
    if (!res.ok) {
        // This will activate the closest `error.js` Error Boundary
        throw new Error('Failed to fetch data: ' + result.error);
    }

    return result;
}

export default async function Page({ searchParams }: { searchParams?: { fail?: string }  }) {
    const shouldFail = searchParams?.fail === 'true';
    const data = await getData(shouldFail);

    return (<div>Data Fetching Error Example: { data.data.length }</div>);
}
