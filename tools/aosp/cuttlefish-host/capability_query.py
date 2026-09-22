#!/usr/bin/python3
# Copyright (C) 2018 The Android Open Source Project
# Licensed under the Apache License, Version 2.0 (the "License");
"""Minimal capability probe expected by Cuttlefish host binaries.

The stock Cuttlefish host package calls this path before selecting qemu_cli or
vsock. It is copied from the official Cuttlefish helper for this pinned host
package; it reports capabilities rather than bypassing the host check.
"""
import sys


def main():
    capabilities = {"capability_check", "qemu_cli", "vsock"}
    if len(sys.argv) == 1:
        print("\n".join(sorted(capabilities)))
    else:
        sys.exit(len(set(sys.argv[1:]) - capabilities))


if __name__ == "__main__":
    main()
