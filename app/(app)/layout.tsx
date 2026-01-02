"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material"
import { createClient } from "@/lib/supabase/client"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login")
      }
    })
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Daily Microlearning
          </Typography>
          <Button color="inherit" href="/app">
            Dashboard
          </Button>
          <Button color="inherit" href="/billing">
            Billing
          </Button>
          <Button color="inherit" onClick={handleSignOut}>
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: 4 }}>{children}</Box>
    </>
  )
}

