#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""图说 · 本机启动

双击 start.cmd（或桌面上的「图说」）会跑这个脚本：
  1. 在本机起一个静态服务（默认 8765，被占用就往后找）
  2. 自动打开浏览器
  3. 打印局域网网址 + 二维码，手机连同一个 Wi-Fi 扫一下就能用

不联网也照样能用：直接用浏览器打开 index.html 就行。这个脚本只是为了让手机也能打开。
"""
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

根目录 = os.path.dirname(os.path.abspath(__file__))
起始端口 = 8765


def 取局域网IP():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("223.5.5.5", 80))          # 只用来问路，不真的发数据
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def 端口被占(端口):
    """Windows 上不能靠 bind 判断端口有没有人用：
    别人绑了 127.0.0.1:8765，你还能绑 0.0.0.0:8765（默认 SO_REUSEADDR），bind 不报错。
    所以改成主动连一下，有人应答就是被占了。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.35)
    try:
        s.connect(("127.0.0.1", 端口))
        return True
    except OSError:
        return False
    finally:
        s.close()


def 找空端口(起点):
    for 端口 in range(起点, 起点 + 40):
        if 端口被占(端口):
            continue
        探测 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            探测.bind(("0.0.0.0", 端口))
            return 端口
        except OSError:
            continue
        finally:
            探测.close()
    raise RuntimeError("从 %d 往后 40 个端口都被占了" % 起点)


def 画二维码(网址):
    """装了 segno 就打二维码；没装或出错就不打，绝不阻断启动。"""
    try:
        import segno
    except ImportError:
        print("（想在这个窗口直接看到二维码，可以执行：python -m pip install segno）")
        return
    try:
        segno.make(网址, error="m").terminal(compact=True)
    except Exception as 错:                       # noqa: BLE001  二维码只是锦上添花
        print("（二维码没画出来：%s）" % 错)


class 处理器(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *参数, **具名):
        super().__init__(*参数, directory=根目录, **具名)

    def log_message(self, 格式, *参数):
        pass                                      # 别把控制台刷满

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def 主函数(要开浏览器=True):
    端口 = 找空端口(起始端口)
    局域网 = 取局域网IP()
    本机址 = "http://127.0.0.1:%d/index.html" % 端口
    手机址 = "http://%s:%d/index.html" % (局域网, 端口)

    print("")
    print("  图说 · 已经在跑了")
    print("  " + "-" * 46)
    print("  这台电脑：%s" % 本机址)
    print("  手机打开：%s" % 手机址)
    print("  （手机要和这台电脑连同一个 Wi-Fi）")
    print("")
    print("  关掉这个黑窗口就停止；图片都在浏览器里生成，不上传。")
    print("")

    画二维码(手机址)
    if 要开浏览器:
        threading.Timer(0.6, lambda: webbrowser.open(本机址)).start()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", 端口), 处理器) as 服务:
        try:
            服务.serve_forever()
        except KeyboardInterrupt:
            print("\n  已停止。")


if __name__ == "__main__":
    try:
        # --no-open 只起服务、不弹浏览器（自己调试或让别的东西来开的时候用）
        主函数(要开浏览器=not any(参数 in ("--no-open", "--不打开") for 参数 in sys.argv[1:]))
    except Exception as 错:                        # noqa: BLE001  双击运行时别一闪而过
        print("启动失败：%s" % 错)
        input("按回车退出…")
        sys.exit(1)
