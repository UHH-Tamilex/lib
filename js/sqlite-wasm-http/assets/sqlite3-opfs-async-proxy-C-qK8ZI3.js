var G = {}, Y;
function ee() {
  var j;
  if (Y) return G;
  Y = 1;
  const _ = (U, ...h) => postMessage({ type: U, payload: h }), J = function(U) {
    var K;
    const h = function(...e) {
      throw new Error(e.join(" "));
    };
    globalThis.window === globalThis ? h(
      "This code cannot run from the main thread.",
      "Load it as a Worker from a separate Worker."
    ) : (K = navigator == null ? void 0 : navigator.storage) != null && K.getDirectory || h("This API requires navigator.storage.getDirectory.");
    const t = /* @__PURE__ */ Object.create(null);
    t.verbose = 1;
    const X = {
      0: console.error.bind(console),
      1: console.warn.bind(console),
      2: console.log.bind(console)
    }, H = (e, ...s) => {
      t.verbose > e && X[e]("OPFS asyncer:", ...s);
    }, S = (...e) => H(2, ...e), C = (...e) => H(1, ...e), T = (...e) => H(0, ...e), l = /* @__PURE__ */ Object.create(null);
    l.reset = () => {
      let e;
      const s = (o) => o.count = o.time = o.wait = 0;
      for (e in t.opIds)
        s(l[e] = /* @__PURE__ */ Object.create(null));
      let n = l.s11n = /* @__PURE__ */ Object.create(null);
      n = n.serialize = /* @__PURE__ */ Object.create(null), n.count = n.time = 0, n = l.s11n.deserialize = /* @__PURE__ */ Object.create(null), n.count = n.time = 0;
    }, l.dump = () => {
      var i, a;
      let e, s = 0, n = 0, o = 0;
      for (e in t.opIds) {
        const c = l[e];
        s += c.count, n += c.time, o += c.wait, c.avgTime = c.count && c.time ? c.time / c.count : 0;
      }
      console.log(
        (i = globalThis == null ? void 0 : globalThis.location) == null ? void 0 : i.href,
        "metrics for",
        (a = globalThis == null ? void 0 : globalThis.location) == null ? void 0 : a.href,
        `:
`,
        l,
        `
Total of`,
        s,
        "op(s) for",
        n,
        "ms",
        "approx",
        o,
        "ms spent waiting on OPFS APIs."
      ), console.log("Serialization metrics:", l.s11n);
    };
    const b = /* @__PURE__ */ Object.create(null), A = /* @__PURE__ */ new Set(), V = function(e, s) {
      const n = new URL(
        e,
        "file://irrelevant"
      ).pathname;
      return s ? n.split("/").filter((o) => !!o) : n;
    }, P = async function(s, n = !1) {
      const o = V(s, !0), i = o.pop();
      let a = t.rootDir;
      for (const c of o)
        c && (a = await a.getDirectoryHandle(c, { create: !!n }));
      return [a, i];
    }, z = async (e) => {
      if (e.syncHandle) {
        S("Closing sync handle for", e.filenameAbs);
        const s = e.syncHandle;
        return delete e.syncHandle, delete e.xLock, A.delete(e.fid), s.close();
      }
    }, W = async (e) => {
      try {
        await z(e);
      } catch (s) {
        C("closeSyncHandleNoThrow() ignoring:", s, e);
      }
    }, Z = async () => {
      if (A.size)
        for (const e of A) {
          const s = b[e];
          await W(s), S("Auto-unlocked", e, s.filenameAbs);
        }
    }, q = async (e) => {
      if (e.releaseImplicitLocks && A.has(e.fid))
        return W(e);
    };
    class x extends Error {
      constructor(s, ...n) {
        super([
          ...n,
          ": " + s.name + ":",
          s.message
        ].join(" "), {
          cause: s
        }), this.name = "GetSyncHandleError";
      }
    }
    x.convertRc = (e, s) => e instanceof x && (e.cause.name === "NoModificationAllowedError" || e.cause.name === "DOMException" && e.cause.message.indexOf("Access Handles cannot") === 0) ? (
      /*console.warn("SQLITE_BUSY",e),*/
      t.sq3Codes.SQLITE_BUSY
    ) : s;
    const k = async (e, s) => {
      if (!e.syncHandle) {
        const n = performance.now();
        S("Acquiring sync handle for", e.filenameAbs);
        const o = 6, i = t.asyncIdleWaitTime * 2;
        let a = 1, c = i;
        for (; ; c = i * ++a)
          try {
            e.syncHandle = await e.fileHandle.createSyncAccessHandle();
            break;
          } catch (r) {
            if (a === o)
              throw new x(
                r,
                "Error getting sync handle for",
                s + "().",
                o,
                "attempts failed.",
                e.filenameAbs
              );
            C(
              "Error getting sync handle for",
              s + "(). Waiting",
              c,
              "ms and trying again.",
              e.filenameAbs,
              r
            ), Atomics.wait(t.sabOPView, t.opIds.retry, 0, c);
          }
        S(
          "Got",
          s + "() sync handle for",
          e.filenameAbs,
          "in",
          performance.now() - n,
          "ms"
        ), e.xLock || (A.add(e.fid), S("Acquired implicit lock for", s + "()", e.fid, e.filenameAbs));
      }
      return e.syncHandle;
    }, d = (e, s) => {
      S(e + "() => notify(", s, ")"), Atomics.store(t.sabOPView, t.opIds.rc, s), Atomics.notify(t.sabOPView, t.opIds.rc);
    }, B = function(e, s) {
      s.readOnly && h(e + "(): File is read-only: " + s.filenameAbs);
    }, L = /* @__PURE__ */ Object.create(null);
    L.op = void 0, L.start = void 0;
    const p = (e) => {
      L.start = performance.now(), L.op = e, ++l[e].count;
    }, u = () => l[L.op].time += performance.now() - L.start, R = /* @__PURE__ */ Object.create(null);
    R.op = void 0, R.start = void 0;
    const w = (e) => {
      R.start = performance.now(), R.op = e;
    }, f = () => l[R.op].wait += performance.now() - R.start;
    let F = !1;
    const D = {
      "opfs-async-metrics": async () => {
        p("opfs-async-metrics"), l.dump(), d("opfs-async-metrics", 0), u();
      },
      "opfs-async-shutdown": async () => {
        F = !0, d("opfs-async-shutdown", 0);
      },
      mkdir: async (e) => {
        p("mkdir");
        let s = 0;
        w("mkdir");
        try {
          await P(e + "/filepart", !0);
        } catch (n) {
          t.s11n.storeException(2, n), s = t.sq3Codes.SQLITE_IOERR;
        } finally {
          f();
        }
        d("mkdir", s), u();
      },
      xAccess: async (e) => {
        p("xAccess");
        let s = 0;
        w("xAccess");
        try {
          const [n, o] = await P(e);
          await n.getFileHandle(o);
        } catch (n) {
          t.s11n.storeException(2, n), s = t.sq3Codes.SQLITE_IOERR;
        } finally {
          f();
        }
        d("xAccess", s), u();
      },
      xClose: async function(e) {
        const s = "xClose";
        p(s), A.delete(e);
        const n = b[e];
        let o = 0;
        if (w(s), n) {
          if (delete b[e], await z(n), n.deleteOnClose)
            try {
              await n.dirHandle.removeEntry(n.filenamePart);
            } catch (i) {
              C("Ignoring dirHandle.removeEntry() failure of", n, i);
            }
        } else
          t.s11n.serialize(), o = t.sq3Codes.SQLITE_NOTFOUND;
        f(), d(s, o), u();
      },
      xDelete: async function(...e) {
        p("xDelete");
        const s = await D.xDeleteNoWait(...e);
        d("xDelete", s), u();
      },
      xDeleteNoWait: async function(e, s = 0, n = !1) {
        let o = 0;
        w("xDelete");
        try {
          for (; e; ) {
            const [i, a] = await P(e, !1);
            if (!a || (await i.removeEntry(a, { recursive: n }), s !== 4660)) break;
            n = !1, e = V(e, !0), e.pop(), e = e.join("/");
          }
        } catch (i) {
          t.s11n.storeException(2, i), o = t.sq3Codes.SQLITE_IOERR_DELETE;
        }
        return f(), o;
      },
      xFileSize: async function(e) {
        p("xFileSize");
        const s = b[e];
        let n = 0;
        w("xFileSize");
        try {
          const o = await (await k(s, "xFileSize")).getSize();
          t.s11n.serialize(Number(o));
        } catch (o) {
          t.s11n.storeException(1, o), n = x.convertRc(o, t.sq3Codes.SQLITE_IOERR);
        }
        await q(s), f(), d("xFileSize", n), u();
      },
      xLock: async function(e, s) {
        p("xLock");
        const n = b[e];
        let o = 0;
        const i = n.xLock;
        if (n.xLock = s, !n.syncHandle) {
          w("xLock");
          try {
            await k(n, "xLock"), A.delete(e);
          } catch (a) {
            t.s11n.storeException(1, a), o = x.convertRc(a, t.sq3Codes.SQLITE_IOERR_LOCK), n.xLock = i;
          }
          f();
        }
        d("xLock", o), u();
      },
      xOpen: async function(e, s, n, o) {
        const i = "xOpen";
        p(i);
        const a = t.sq3Codes.SQLITE_OPEN_CREATE & n;
        w("xOpen");
        try {
          let c, r;
          try {
            [c, r] = await P(s, !!a);
          } catch (y) {
            t.s11n.storeException(1, y), d(i, t.sq3Codes.SQLITE_NOTFOUND), u(), f();
            return;
          }
          const I = await c.getFileHandle(r, { create: a });
          f();
          const g = Object.assign(/* @__PURE__ */ Object.create(null), {
            fid: e,
            filenameAbs: s,
            filenamePart: r,
            dirHandle: c,
            fileHandle: I,
            sabView: t.sabFileBufView,
            readOnly: a ? !1 : t.sq3Codes.SQLITE_OPEN_READONLY & n,
            deleteOnClose: !!(t.sq3Codes.SQLITE_OPEN_DELETEONCLOSE & n)
          });
          g.releaseImplicitLocks = o & t.opfsFlags.OPFS_UNLOCK_ASAP || t.opfsFlags.defaultUnlockAsap, b[e] = g, d(i, 0);
        } catch (c) {
          f(), T(i, c), t.s11n.storeException(1, c), d(i, t.sq3Codes.SQLITE_IOERR);
        }
        u();
      },
      xRead: async function(e, s, n) {
        p("xRead");
        let o = 0, i;
        const a = b[e];
        try {
          w("xRead"), i = (await k(a, "xRead")).read(
            a.sabView.subarray(0, s),
            { at: Number(n) }
          ), f(), i < s && (a.sabView.fill(0, i, s), o = t.sq3Codes.SQLITE_IOERR_SHORT_READ);
        } catch (c) {
          i === void 0 && f(), T("xRead() failed", c, a), t.s11n.storeException(1, c), o = x.convertRc(c, t.sq3Codes.SQLITE_IOERR_READ);
        }
        await q(a), d("xRead", o), u();
      },
      xSync: async function(e, s) {
        p("xSync");
        const n = b[e];
        let o = 0;
        if (!n.readOnly && n.syncHandle) {
          try {
            w("xSync"), await n.syncHandle.flush();
          } catch (i) {
            t.s11n.storeException(2, i), o = t.sq3Codes.SQLITE_IOERR_FSYNC;
          }
          f();
        }
        d("xSync", o), u();
      },
      xTruncate: async function(e, s) {
        p("xTruncate");
        let n = 0;
        const o = b[e];
        w("xTruncate");
        try {
          B("xTruncate", o), await (await k(o, "xTruncate")).truncate(s);
        } catch (i) {
          T("xTruncate():", i, o), t.s11n.storeException(2, i), n = x.convertRc(i, t.sq3Codes.SQLITE_IOERR_TRUNCATE);
        }
        await q(o), f(), d("xTruncate", n), u();
      },
      xUnlock: async function(e, s) {
        p("xUnlock");
        let n = 0;
        const o = b[e];
        if (t.sq3Codes.SQLITE_LOCK_NONE === s && o.syncHandle) {
          w("xUnlock");
          try {
            await z(o);
          } catch (i) {
            t.s11n.storeException(1, i), n = t.sq3Codes.SQLITE_IOERR_UNLOCK;
          }
          f();
        }
        d("xUnlock", n), u();
      },
      xWrite: async function(e, s, n) {
        p("xWrite");
        let o;
        const i = b[e];
        w("xWrite");
        try {
          B("xWrite", i), o = s === (await k(i, "xWrite")).write(
            i.sabView.subarray(0, s),
            { at: Number(n) }
          ) ? 0 : t.sq3Codes.SQLITE_IOERR_WRITE;
        } catch (a) {
          T("xWrite():", a, i), t.s11n.storeException(1, a), o = x.convertRc(a, t.sq3Codes.SQLITE_IOERR_WRITE);
        }
        await q(i), f(), d("xWrite", o), u();
      }
    }, $ = () => {
      if (t.s11n) return t.s11n;
      const e = new TextDecoder(), s = new TextEncoder("utf-8"), n = new Uint8Array(t.sabIO, t.sabS11nOffset, t.sabS11nSize), o = new DataView(t.sabIO, t.sabS11nOffset, t.sabS11nSize);
      t.s11n = /* @__PURE__ */ Object.create(null);
      const i = /* @__PURE__ */ Object.create(null);
      i.number = { id: 1, size: 8, getter: "getFloat64", setter: "setFloat64" }, i.bigint = { id: 2, size: 8, getter: "getBigInt64", setter: "setBigInt64" }, i.boolean = { id: 3, size: 4, getter: "getInt32", setter: "setInt32" }, i.string = { id: 4 };
      const a = (r) => i[typeof r] || h("Maintenance required: this value type cannot be serialized.", r), c = (r) => {
        switch (r) {
          case i.number.id:
            return i.number;
          case i.bigint.id:
            return i.bigint;
          case i.boolean.id:
            return i.boolean;
          case i.string.id:
            return i.string;
          default:
            h("Invalid type ID:", r);
        }
      };
      return t.s11n.deserialize = function(r = !1) {
        ++l.s11n.deserialize.count;
        const I = performance.now(), g = n[0], y = g ? [] : null;
        if (g) {
          const E = [];
          let m = 1, O, v, N;
          for (O = 0; O < g; ++O, ++m)
            E.push(c(n[m]));
          for (O = 0; O < g; ++O) {
            const Q = E[O];
            Q.getter ? (N = o[Q.getter](m, t.littleEndian), m += Q.size) : (v = o.getInt32(m, t.littleEndian), m += 4, N = e.decode(n.slice(m, m + v)), m += v), y.push(N);
          }
        }
        return r && (n[0] = 0), l.s11n.deserialize.time += performance.now() - I, y;
      }, t.s11n.serialize = function(...r) {
        const I = performance.now();
        if (++l.s11n.serialize.count, r.length) {
          const g = [];
          let y = 0, E = 1;
          for (n[0] = r.length & 255; y < r.length; ++y, ++E)
            g.push(a(r[y])), n[E] = g[y].id;
          for (y = 0; y < r.length; ++y) {
            const m = g[y];
            if (m.setter)
              o[m.setter](E, r[y], t.littleEndian), E += m.size;
            else {
              const O = s.encode(r[y]);
              o.setInt32(E, O.byteLength, t.littleEndian), E += 4, n.set(O, E), E += O.byteLength;
            }
          }
        } else
          n[0] = 0;
        l.s11n.serialize.time += performance.now() - I;
      }, t.s11n.storeException = t.asyncS11nExceptions ? (r, I) => {
        r <= t.asyncS11nExceptions && t.s11n.serialize([I.name, ": ", I.message].join(""));
      } : () => {
      }, t.s11n;
    }, M = async function() {
      const s = /* @__PURE__ */ Object.create(null);
      for (let n of Object.keys(t.opIds)) {
        const o = D[n];
        if (!o) continue;
        const i = /* @__PURE__ */ Object.create(null);
        s[t.opIds[n]] = i, i.key = n, i.f = o;
      }
      for (; !F; )
        try {
          if (Atomics.wait(
            t.sabOPView,
            t.opIds.whichOp,
            0,
            t.asyncIdleWaitTime
          ) !== "not-equal") {
            await Z();
            continue;
          }
          const n = Atomics.load(t.sabOPView, t.opIds.whichOp);
          Atomics.store(t.sabOPView, t.opIds.whichOp, 0);
          const o = s[n] ?? h("No waitLoop handler for whichOp #", n), i = t.s11n.deserialize(
            !0
            /* clear s11n to keep the caller from confusing this with
               an exception string written by the upcoming
               operation */
          ) || [];
          o.f ? await o.f(...i) : T("Missing callback for opId", n);
        } catch (n) {
          T("in waitLoop():", n);
        }
    };
    navigator.storage.getDirectory().then(function(e) {
      t.rootDir = e, globalThis.onmessage = function({ data: s }) {
        switch (s.type) {
          case "opfs-async-init": {
            const n = s.args;
            for (const o in n) t[o] = n[o];
            t.verbose = n.verbose ?? 1, t.sabOPView = new Int32Array(t.sabOP), t.sabFileBufView = new Uint8Array(t.sabIO, 0, t.fileBufferSize), t.sabS11nView = new Uint8Array(t.sabIO, t.sabS11nOffset, t.sabS11nSize), Object.keys(D).forEach((o) => {
              Number.isFinite(t.opIds[o]) || h("Maintenance required: missing state.opIds[", o, "]");
            }), $(), l.reset(), S("init state", t), _("opfs-async-inited"), M();
            break;
          }
          case "opfs-async-restart":
            F && (C("Restarting after opfs-async-shutdown. Might or might not work."), F = !1, M());
            break;
          case "opfs-async-metrics":
            l.dump();
            break;
        }
      }, _("opfs-async-loaded");
    }).catch((e) => T("error initializing OPFS asyncer:", e));
  };
  return globalThis.SharedArrayBuffer ? globalThis.Atomics ? !globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle || !((j = navigator == null ? void 0 : navigator.storage) != null && j.getDirectory) ? _("opfs-unavailable", "Missing required OPFS APIs.") : J() : _(
    "opfs-unavailable",
    "Missing Atomics API.",
    "The server must emit the COOP/COEP response headers to enable that."
  ) : _(
    "opfs-unavailable",
    "Missing SharedArrayBuffer API.",
    "The server must emit the COOP/COEP response headers to enable that."
  ), G;
}
ee();
