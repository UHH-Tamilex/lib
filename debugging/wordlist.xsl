<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:exsl="http://exslt.org/common"
                xmlns:x="http://www.tei-c.org/ns/1.0"
                xmlns:tst="https://github.com/tst-project"
                exclude-result-prefixes="x tst">

<xsl:output method="html" encoding="UTF-8" omit-xml-declaration="yes" indent="no"/>

<xsl:template match="x:standOff">
    <xsl:element name="table">
        <xsl:element name="thead">
            <th>Tamil</th><th>English</th><th>grammar</th><th>particle</th>
        </xsl:element>
        <xsl:element name="tbody">
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:element>
</xsl:template>

<xsl:template match="x:interp"/>
<xsl:template match="x:superEntry">
    <xsl:apply-templates/>
</xsl:template>
<xsl:template match="x:superEntry/x:entry">
    <xsl:apply-templates>
        <xsl:with-param name="type">superEntry</xsl:with-param>
    </xsl:apply-templates>
</xsl:template>

<xsl:template match="x:entry">
    <xsl:param name="type"/>
    <xsl:element name="tr">
        <xsl:element name="th">
            <xsl:if test="$type = 'superEntry'">
                <xsl:attribute name="class">superEntry</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="lang">ta-Latn</xsl:attribute>
            <xsl:choose>
                <xsl:when test="x:form[@type='simple']">
                    <xsl:apply-templates select="x:form[@type='simple']"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:variable name="form"><xsl:value-of select="x:form"/></xsl:variable>
                    <xsl:value-of select="translate($form,'~+()','')"/>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:apply-templates select="x:note"/>
        </xsl:element>
        <xsl:element name="td">
        <xsl:if test="x:def">
            <xsl:apply-templates select="x:def"/>
        </xsl:if>
        </xsl:element>
        <xsl:element name="td">
            <xsl:apply-templates select="x:gramGrp[not(@type)]"/>
        </xsl:element>
        <xsl:element name="td">
            <xsl:attribute name="lang">ta-Latn</xsl:attribute>
            <xsl:apply-templates select="x:gramGrp[@type='particle']"/>
        </xsl:element>
    </xsl:element>
</xsl:template>

<xsl:template match="x:note">
    <xsl:element name="span">
        <xsl:attribute name="data-anno"/>
        <xsl:attribute name="class">footnote</xsl:attribute>
        <xsl:text>*</xsl:text>
        <xsl:element name="span">
            <xsl:attribute name="class">anno-inline</xsl:attribute>
            <xsl:attribute name="lang">en</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:element>
</xsl:template>

<xsl:template match="x:def">
    <xsl:element name="span">
    <xsl:attribute name="contenteditable">true</xsl:attribute>
    <xsl:attribute name="spellcheck">true</xsl:attribute>
        <xsl:apply-templates/>
    </xsl:element>
    <xsl:text> </xsl:text>
</xsl:template>

<xsl:template match="x:gramGrp[not(@type)]">
    <xsl:for-each select="x:gram">
        <xsl:value-of select="."/>
        <xsl:if test="position() != last()">
            <xsl:element name="br"/>
        </xsl:if>
    </xsl:for-each>
</xsl:template>
<xsl:template match="x:gramGrp[@type='particle']">
    <xsl:value-of select="x:m"/>
</xsl:template>
</xsl:stylesheet>
