import type { TAbstractFile } from 'obsidian'
import { Plugin, TFile, TFolder } from 'obsidian'

export default class AutoHomePagePlugin extends Plugin {
  async onload() {
    const getParent = (file: TAbstractFile) => {
      let parent = file.parent

      while (!parent.parent.isRoot())
        parent = parent.parent

      return parent
    }

    const getTree = (parent: TFolder) => {
      const subtree: Record<string, any> = {}

      parent.children.forEach((entry) => {
        if (entry instanceof TFolder)
          subtree[entry.name] = getTree(entry)

        else if (entry instanceof TFile)
          subtree[entry.basename] = entry.path
      })

      return subtree
    }

    const buildList = (tree: Record<string, any>, offset = 0) => {
      let page = ''

      Object.entries(tree).forEach(([key, item]) => {
        if (typeof item === 'string') {
          page += `${'    '.repeat(offset)}- [[${item}|${key}]]\n`
        }
        else {
          page += `${'    '.repeat(offset)}- ${key}\n`
          page += buildList(item, offset + 1)
        }
      })

      return page
    }

    const rebuild = async (parent: TFolder) => {
      if (!parent)
        return

      const tree = getTree(parent)
      const path = `${parent.path}/Home.md`

      delete tree.Home

      const file = this.app.vault.getAbstractFileByPath(path)

      if (file instanceof TFile && file) {
        const content = await this.app.vault.read(file)

        const splitIndex = content.lastIndexOf('\n---\n')
        const before = content.slice(0, splitIndex)

        this.app.vault.modify(file, `${before}\n---\n\n${buildList(tree)}`)
      }
    }

    const rebuildAll = () => {
      this.app.vault.getRoot().children.forEach((entry) => {
        if (entry instanceof TFolder)
          rebuild(entry)
      })
    }

    this.addRibbonIcon('dice', 'Generate Homepage', () => {
      rebuildAll()
    })

    this.registerEvent(this.app.vault.on('rename', file => rebuild(getParent(file))))
  }
}
