import os, json

def list_files(directory_path):
    files = []
    for entry in os.scandir(directory_path):
        try:
            if entry.is_file():
                for ext in ['.js', '.png', '.html', '.less', '.css', '.jpg', '.txt']:
                    if ext in entry.path:
                        files.append(entry.path)
                        print(entry.path)
            elif entry.is_dir():
                c = 0
                for fol in ['usr', 'bin', 'home', 'etc', 'mnt', 'var', 'tmp', 'media', 'dev', 'boot', 'opt', 'proc']:
                    if fol in entry.name:
                        c += 1
                if c == 0:
                    files.extend(list_files(entry.path))
        except:
            print('error accessing file')
    return files
all_files = list_files('/')
for i in range(len(all_files)):
    all_files[i] = all_files[i].replace('\\', '/')
olddata = open('/src/files.json', 'r')
open('/src/files.json', 'w').write(json.dumps(all_files))
if olddata.readlines() != open('/src/files.json', 'r').readlines():
    os.system('git config --global user.name "actions"')
    os.system('git config --global user.email ""')
    os.system('git add -A')
    os.system('git commit -m "update list"')
    os.system('git push')
