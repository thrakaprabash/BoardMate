# BoardMate Frontend

Frontend for the BoardMate Hostel Management System.

## Setup Instructions

1. Install dependencies:
```
npm install
```

2. Run the development server:
```
npm run dev
```

3. Build for production:
```
npm run build
```

## Troubleshooting

If you encounter issues with dependencies, try:

1. Delete the node_modules folder and package-lock.json:
```
rm -rf node_modules package-lock.json
```

2. Install with legacy peer deps:
```
npm install --legacy-peer-deps
```

3. If react-scripts is still not found, install it explicitly:
```
npm install react-scripts
```
