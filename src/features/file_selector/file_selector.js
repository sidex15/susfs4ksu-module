import { exec } from 'kernelsu'

const ICONS = {
  back: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>`,
  folder: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 shrink-0 text-base-content/70"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0v6a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-6m-19.5 0V8.25A2.25 2.25 0 0 1 4.5 6h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H19.5a2.25 2.25 0 0 1 2.25 2.25v.75" /></svg>`,
  file: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 shrink-0 text-base-content/70"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`,
  folderOpen: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.067.228-.13.349-.19a9.001 9.001 0 0 1 4.349-1.067 9 9 0 0 1 7.103 3.467m-11.5 0a9.001 9.001 0 0 1-2.218-5.69V6.75a2.25 2.25 0 0 1 2.25-2.25h2.846a2.25 2.25 0 0 1 1.66.732l1.34 1.464M3.75 9.776v9.474c0 .621.504 1.125 1.125 1.125h13.25a1.125 1.125 0 0 0 1.125-1.125v-7.875a2.25 2.25 0 0 0-2.25-2.25H9.426" /></svg>`,
}

export class FileSelector {
  #fileType = ''
  #fileSelectorMode = 'path'
  #currentPath = '/storage/emulated/0/Download'
  #resolvePromise = null
  #dialog = null
  #fileList = null
  #currentPathEl = null

  appendTo(container) {
    container.appendChild(this.#getElement())
  }

  #getElement() {
    const template = document.createElement('template')
    template.innerHTML = `
      <dialog class="file-selector-dialog modal">
        <div class="modal-box flex flex-col gap-0 p-0 max-w-md max-h-[80vh]">
          <div class="flex items-center gap-1 px-4 pt-4 pb-2">
            <button class="back-button btn btn-ghost btn-circle btn-sm shrink-0">${ICONS.back}</button>
            <div class="current-path flex-1 overflow-x-auto whitespace-nowrap text-sm font-mono py-1"></div>
          </div>
          <div class="file-list flex-1 overflow-y-auto px-2 flex flex-col transition-opacity duration-150"></div>
          <div class="modal-action items-center px-4 py-3 mt-0 border-t border-base-300">
            <button class="open-system-file btn btn-ghost btn-circle btn-sm">${ICONS.folderOpen}</button>
            <div class="flex-1"></div>
            <button class="close-selector btn btn-sm font-sans" data-i18n="cancel_label">Cancel</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    `

    const fragment = template.content
    this.#dialog = fragment.querySelector('.file-selector-dialog')
    this.#fileList = this.#dialog.querySelector('.file-list')
    this.#currentPathEl = this.#dialog.querySelector('.current-path')

    this.#currentPathEl.onclick = this.#onPathSegmentClick.bind(this)
    fragment.querySelector('.back-button').onclick = this.#navigateBack.bind(this)
    fragment.querySelector('.close-selector').onclick = this.#close.bind(this)
    fragment.querySelector('.open-system-file').onclick = this.#openSystemFile.bind(this)

    const cancelLabel = fragment.querySelector('.close-selector')
    cancelLabel.textContent = window.i18n ? window.i18n.getTranslation('cancel_label') : 'Cancel'

    return fragment
  }

  #onPathSegmentClick(event) {
    const segment = event.target.closest('.path-segment')
    if (!segment) return

    const targetPath = segment.dataset.path
    if (!targetPath || targetPath === this.#currentPath) return

    const clickedSegment = segment.textContent
    if ((clickedSegment === 'storage' || clickedSegment === 'emulated') &&
        this.#currentPath === '/storage/emulated/0') {
      return
    }

    if (targetPath.split('/').length <= 3) {
      this.#currentPath = '/storage/emulated/0'
    } else {
      this.#currentPath = targetPath
    }
    this.#updateCurrentPath()
    this.#listFiles(this.#currentPath)
  }

  #navigateBack() {
    if (this.#currentPath === '/storage/emulated/0') return
    this.#currentPath = this.#currentPath.split('/').slice(0, -1).join('/')
    if (this.#currentPath === '') this.#currentPath = '/storage/emulated/0'
    this.#updateCurrentPath()
    this.#listFiles(this.#currentPath)
  }

  #openSystemFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (event) => {
      const file = event.target.files?.[0]
      if (!file || !this.#resolvePromise) return
      if (!file.name.endsWith(`.${this.#fileType}`)) return

      if (this.#fileSelectorMode === 'content') {
        const reader = new FileReader()
        reader.onload = () => this.#resolve(reader.result)
        reader.readAsText(file)
      } else {
        this.#resolve(file.name)
      }
    }
    input.click()
  }

  getFilePath(type) {
    return this.#open(type, 'path')
  }

  getFileContent(type) {
    return this.#open(type, 'content')
  }

  async #open(type, mode) {
    this.#fileType = type
    this.#fileSelectorMode = mode
    this.#currentPath = '/storage/emulated/0/Download'

    const openSystemFile = this.#dialog?.querySelector('.open-system-file')
    if (openSystemFile) {
      openSystemFile.classList.toggle('hidden', mode === 'path')
    }

    this.#dialog?.showModal()
    this.#updateCurrentPath()

    await this.#listFiles(this.#currentPath, true)

    return new Promise((resolve) => {
      this.#resolvePromise = resolve
    })
  }

  async #listFiles(path, skipAnimation = false) {
    if (!this.#fileList) return

    if (!skipAnimation) {
      this.#fileList.classList.add('opacity-0')
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    const result = await exec(`
      cd "${path}"
      for f in *; do
        [ -d "$f" ] && echo "d|$f" || { [[ "$f" == *.${this.#fileType} ]] && echo "f|$f"; }
      done | sort
    `)

    if (result.errno === 0) {
      this.#fileList.innerHTML = ''

      if (this.#currentPath !== '/storage/emulated/0') {
        const backItem = document.createElement('div')
        backItem.className = 'file-item flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-base-200 active:bg-base-300 font-sans'
        backItem.innerHTML = `
          ${ICONS.folder}
          <span class="truncate text-sm">..</span>
        `
        backItem.onclick = () => {
          this.#dialog?.querySelector('.back-button')?.click()
        }
        this.#fileList.appendChild(backItem)
      }

      const processedItems = result.stdout.split('\n')
        .filter(Boolean)
        .map(line => {
          const [type, name] = [line.slice(0, 1), line.slice(2)]
          return { name, path: path + '/' + name, isDirectory: type === 'd' }
        })

      for (const item of processedItems) {
        const itemElement = document.createElement('div')
        itemElement.className = 'file-item flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-base-200 active:bg-base-300 font-sans'
        itemElement.innerHTML = `
          ${item.isDirectory ? ICONS.folder : ICONS.file}
          <span class="truncate text-sm">${item.name}</span>
        `
        itemElement.onclick = () => {
          if (item.isDirectory) {
            this.#currentPath = item.path
            this.#updateCurrentPath()
            this.#listFiles(item.path)
          } else {
            this.#resolveFile(item.path)
          }
        }
        this.#fileList.appendChild(itemElement)
      }

      if (!skipAnimation) {
        this.#fileList.classList.remove('opacity-0')
      }
    } else {
      console.error('Error listing files:', result.stderr)
      if (!skipAnimation) {
        this.#fileList.classList.remove('opacity-0')
      }
    }
    this.#updateCurrentPath()
  }

  async #resolveFile(path) {
    if (this.#fileSelectorMode === 'content') {
      const execResult = await exec(`cat "${path}"`)
      if (execResult.errno === 0) {
        this.#resolve(execResult.stdout)
      } else {
        console.error(`Failed to read file content: ${execResult.stderr}`)
        this.#resolve(null)
      }
    } else {
      this.#resolve(path)
    }
  }

  #updateCurrentPath() {
    if (!this.#currentPathEl) return
    const segments = this.#currentPath.split('/').filter(Boolean)
    const pathHTML = segments.map((segment, index) => {
      const fullPath = '/' + segments.slice(0, index + 1).join('/')
      return `<span class="path-segment cursor-pointer hover:underline" data-path="${fullPath}">${segment}</span>`
    }).join('<span class="mx-1 text-base-content/40">›</span>')

    this.#currentPathEl.innerHTML = pathHTML
    this.#currentPathEl.scrollTo({
      left: this.#currentPathEl.scrollWidth,
      behavior: 'smooth',
    })
  }

  #resolve(value) {
    this.#resolvePromise?.(value)
    this.#resolvePromise = null
    this.#close()
  }

  #close() {
    this.#dialog?.close()
    if (this.#resolvePromise) {
      this.#resolvePromise(null)
      this.#resolvePromise = null
    }
  }
}
