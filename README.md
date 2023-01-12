# Notion ORM

<aside>
👉 This package is currently still in development.

</aside>

# Description

A library to simplify interacting with [Notion](https://notion.so/product) databases/tables via Notion API

## Disclaimer
### Available Database Features
- Adding
- Querying

### Supported Column Types
- Multiselect
- Select
- Status
- Date
- Text
- Url
- Checkbox
- Email 
- Phone Number

# Install and Setup

```bash
npm install @haustle/notion-orm
```

The only requirement is a Notion Developer API Key ([here](https://developers.notion.com/)) and database IDs you want

1. At the root of your project create pass your developer key and database IDs ([help](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)). 
    ```
    Copy database/table URL
    https://www.notion.so/haustle/<This-is-the-database-id>?v=123
    ```
    ```jsx
    // notion.config.js
    
    const NotionConfig = {
    	auth: process.env.NOTION_KEY,
    	databaseIds: [
    	    "a52239e4839d4a3a8f4875376cfbfb02", 
    	    "5f4bf76a1e3f48d684d2506ea2690d64"
    	],
    };
    
    module.exports = NotionConfig;
    ```
    - Be sure to connect your integration with your tables
    
2. Generate Types
    
    ```bash
    npx notion generate
    ```
    
3. Import databases in your TypeScript file
    
    ```tsx
    // Barrel import, giving you access to all your databases
    import * as notion from "@haustle/notion-orm"
    
    // Import specific database
    import { databaseName } from "@haustle/notion-orm"
    ```
    

# Actions

## Add a page

Page title is required when adding

```tsx
notion.books.add({
    name: "Catcher in the Rye",
    rating: "⭐️⭐️⭐️⭐️⭐️"
})
```

## Query Database

### Single Filter

```tsx
notion.books.query({
    filter: {
        genre: {
            contains: "Sci-Fi"
        }
    }
})
```

### Nested Filters

```tsx
await notion.books.query({
    filter: {
        or: [
            {
                genre: {
                    contains: "Sci-Fi",
                },
            },
            {
                genre: {
                    contains: "Biography",
                },
            },
        ],
    },
});
```

## What is Object Relational Map (ORM)

> …[programming](https://en.wikipedia.org/wiki/Computer_programming) technique for converting data between [type systems](https://en.wikipedia.org/wiki/Type_system) using [object-oriented](https://en.wikipedia.org/wiki/Object-oriented)  programming languages. This creates, in effect, a "virtual [object database](https://en.wikipedia.org/wiki/Object_database)" that can be used from within the programming language.
> 

[Wikipedia](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)

# Story

While taking a databases class I got exposed to Prisma and thought the developer experience was magical. Around the same time the Notion Developer API was rolling out and I thought the idea of bringing creating a ORM to Notion databases would be a fun cool idea, but I was terrible at TypeScript.

This project was started as a way to strengthen my TypeScript knowledge. I’ve succeeded in some regard, but there are still a few `@ts-ignore` in the project.
