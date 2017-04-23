# dat-next-next-staging

Experimental quick-n-dirty file sharing tool on top of dat with a staging area. Supports `.datignore` file.

```
npm install dat-next-next-staging
```

## Usage

One one computer

```
cd cool-directory
dat-next-next-staging
```

You will see a listing of unpublished files, plus a key:

```
Sharing: ~/cool-directory
Key is: {key}
ADD hello.txt
ADD dir/
ADD dir/foo.png
```

Publish and share with:

```
dat-next-next-staging publish
```

Or remove all unpublished changes with:

```
dat-next-next-staging revert
```

On another computer/folder, download:

```
mkdir cool-directory-clone
cd cool-directory-clone
dat-next-next-staging {key}
```

## License

MIT
