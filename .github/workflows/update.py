import os, json, shutil

def list_files(directory_path):
    files = []
    for entry in os.scandir(directory_path):
        try:
            if entry.is_file():
                for ext in ['.js', '.png', '.html', '.less', '.css']:
                    if ext in entry.path:
                        files.append(entry.path)
                        print(entry.path)
            elif entry.is_dir():
                files.extend(list_files(entry.path))
                print(entry.path)
        except:
            ''
    return files
os.system('git clone https://github.com/nroutasuo/level13.git')
all_files = list_files('level13')
for i in range(len(all_files)):
    all_files[i] = all_files[i].replace('level13', '').replace('\\', '/')
olddata = open('src/files.json', 'r')
open('src/files.json', 'w').write(json.dumps(all_files))
shutil.rmtree('level13')
if olddata.readlines() != open('src/files.json', 'r').readlines():
    os.system('git config --global user.name "actions"')
    os.system('git config --global user.email ""')
    os.system('git add -A')
    os.system('git commit -m "update list"')
    os.system('git push')
